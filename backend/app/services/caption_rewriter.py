"""
Rewrite raw SRT transcript into social-media-ready caption using DeepSeek V4 Flash.

DeepSeek API is OpenAI-compatible — we reuse the openai SDK with a different base_url.
"""

import os
import re
from openai import OpenAI

DEEPSEEK_BASE_URL = "https://api.deepseek.com"


def _get_client() -> OpenAI:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        # Fallback: coba dari config/settings
        from app.config import settings
        api_key = getattr(settings, "deepseek_api_key", None)
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY tidak ditemukan. Tambahkan ke backend/.env")
    return OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)


def _srt_to_plain_text(srt_content: str) -> str:
    """Ekstrak teks polos dari format SRT (tanpa nomor & timestamp)."""
    lines = srt_content.split("\n")
    text_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if re.match(r"^\d+$", line):
            continue
        if re.match(r"^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->", line):
            continue
        text_lines.append(line)
    return " ".join(text_lines)


def generate_social_caption(
    srt_content: str = "",
    max_words: int = 40,
    hashtag_count: int = 5,
    tone: str = "casual",
    language: str = "indonesian",
    product_context: dict | None = None,
) -> str:
    """
    Generate caption siap upload sosmed dari produk (prioritas) atau transkrip SRT.

    Jika product_context tersedia → caption MURNI dari info produk (tanpa transkrip).
    Jika TIDAK ada product_context → fallback ke transkrip SRT.
    Ini mencegah kata-kata dari transkrip Whisper bocor ke caption yang
    seharusnya fokus menjual produk.

    Args:
        srt_content: Teks SRT mentah (hanya dipakai jika TIDAK ada product_context)
        max_words: Maksimum kata dalam caption (default 40)
        hashtag_count: Jumlah hashtag yang dihasilkan (default 5)
        tone: Gaya bahasa — "casual", "formal", "dramatic", "humor"
        language: Bahasa output caption
        product_context: Dict dengan "product_name" & "product_description"

    Returns:
        String caption siap pakai untuk sosmed
    """
    has_product = product_context and product_context.get("product_name")
    plain_text = _srt_to_plain_text(srt_content) if srt_content else ""

    if not has_product and not plain_text.strip():
        return ""

    client = _get_client()

    if has_product:
        name = product_context["product_name"]
        desc = product_context.get("product_description", "")

        # Product ONLY — jangan sertakan transkrip SRT sama sekali.
        # Transkrip Whisper sering mengandung kata-kata yang TIDAK relevan
        # dengan produk dan bisa mengotori caption.
        # Caption HARUS murni dari info produk.
        prompt = f"""Kamu adalah copywriter yang jago bikin caption jualan untuk sosmed.

BERIKUT ADALAH PRODUK YANG HARUS KAMU JUAL:
- Nama Produk: {name}
{f"- Deskripsi: {desc}" if desc else ""}

Buat caption sosmed yang PERSUASIF untuk menjual produk ini.
Gunakan KREATIVITAS kamu sendiri berdasarkan info produk di atas.

ATURAN:
- Maksimal {max_words} kata untuk caption utama
- Sertakan tepat {hashtag_count} hashtag yang relevan di bagian bawah
- Gaya bahasa: {tone}
- Bahasa: {language}
- Gunakan emoji secukupnya (2-4 emoji)
- Format output: caption dulu, lalu hashtag di baris terpisah
- WAJIB menyebutkan nama produk "**{name}**" di dalam caption
- Buat caption yang engaging, FOMO, bikin penasaran!

CAPTION:"""
    else:
        # No product context — fallback to transcript-only
        prompt = f"""Kamu adalah asisten kreator konten. Ubah transkrip video berikut menjadi caption sosial media yang menarik.

ATURAN:
- Maksimal {max_words} kata untuk caption utama
- Sertakan tepat {hashtag_count} hashtag yang relevan di bagian bawah
- Gaya bahasa: {tone}
- Bahasa: {language}
- Gunakan emoji secukupnya (2-4 emoji)
- Buat caption yang engaging, bukan sekadar ringkasan
- Format output: caption dulu, lalu hashtag di baris terpisah

TRANSKRIP VIDEO:
{plain_text}

CAPTION:"""

    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[
            {"role": "system", "content": "Kamu adalah copywriter profesional. Output HANYA caption final, tanpa penjelasan apapun."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.8,
        max_tokens=500,
        extra_body={"thinking": {"type": "disabled"}},  # Matikan reasoning mode
    )

    caption = response.choices[0].message.content.strip()
    return caption


def generate_cover_title(
    srt_content: str = "",
    max_words: int = 5,
    style: str = "Santai & Gaul (Gen-Z)",
    language: str = "indonesian",
    product_context: dict | None = None,
) -> str:
    """
    Generate judul pendek untuk cover video dari produk (prioritas) atau transkrip.

    Jika product_context tersedia → judul MURNI dari nama produk (tanpa transkrip).
    Jika TIDAK ada product_context → fallback ke transkrip SRT.
    Ini mencegah kata-kata dari transkrip Whisper (seperti "saku", "ini", "itu")
    bocor ke judul cover yang seharusnya menampilkan nama produk.

    Args:
        srt_content: Teks SRT mentah (hanya dipakai jika TIDAK ada product_context)
        max_words: Maksimum kata dalam judul (default 5)
        style: Gaya bahasa (sama dengan caption social)
        language: Bahasa output
        product_context: Dict dengan "product_name"

    Returns:
        String judul pendek siap dipakai di cover
    """
    has_product = product_context and product_context.get("product_name")
    plain_text = _srt_to_plain_text(srt_content) if srt_content else ""

    if not has_product and not plain_text.strip():
        return ""

    client = _get_client()

    if has_product:
        name = product_context["product_name"]
        desc = product_context.get("product_description", "")

        # Product ONLY — jangan sertakan transkrip SRT sama sekali.
        # Transkrip Whisper sering mengandung kata-kata yang TIDAK ada di nama produk
        # (seperti "saku", "ini", "itu") yang bisa bocor ke judul cover.
        # Cover title HARUS murni dari nama produk.
        prompt = f"""Tugas: Buat judul cover SINGKAT ({max_words} kata) untuk produk di bawah ini.

PRODUK: {name}
{f"Deskripsi: {desc}" if desc else ""}

ATURAN WAJIB:
- Judul HARUS mengandung kata "{name}"
- MAKSIMAL {max_words} kata — lebih pendek lebih baik
- Gaya: {style}
- Bahasa: {language}
- Harus catchy, bikin penasaran, dan menjual!
- JANGAN pakai hashtag, emoji, atau tanda kutip
- Output HANYA judulnya saja

JUDUL ({max_words} kata max):"""
    else:
        # No product context — fallback to transcript-only
        prompt = f"""Buat judul video SINGKAT dari transkrip berikut.

ATURAN PENTING:
- MAKSIMAL {max_words} kata!
- Gaya: {style}
- Bahasa: {language}
- Harus catchy & bikin penasaran
- JANGAN pakai hashtag
- JANGAN pakai emoji
- Output HANYA judulnya saja, tanpa kutipan atau penjelasan

TRANSKRIP:
{plain_text}

JUDUL:"""

    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[
            {"role": "system", "content": "Kamu adalah ahli pembuat judul PROMOSI PRODUK. Output HANYA judul produk, jangan ulangi transkrip. Jangan beri penjelasan apapun."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.9,
        max_tokens=80,
        extra_body={"thinking": {"type": "disabled"}},
    )

    title = response.choices[0].message.content.strip()
    # Bersihkan: hapus tanda kutip, hashtag, emoji
    title = title.strip('"\'\"').strip()

    # Debug: log prompt & response
    has_product_flag = product_context and product_context.get("product_name")
    print(f"[COVER-TITLE] Product: {product_context.get('product_name') if has_product_flag else 'NONE'} → Title: \"{title}\"")
    print(f"[COVER-TITLE] Prompt (first 200 chars): {prompt[:200]}...")

    return title
