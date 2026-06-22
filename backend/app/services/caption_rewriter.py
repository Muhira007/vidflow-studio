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
    srt_content: str,
    max_words: int = 40,
    hashtag_count: int = 5,
    tone: str = "casual",
    language: str = "indonesian",
) -> str:
    """
    Generate caption siap upload sosmed dari transkrip SRT.

    Args:
        srt_content: Teks SRT mentah hasil Whisper
        max_words: Maksimum kata dalam caption (default 40)
        hashtag_count: Jumlah hashtag yang dihasilkan (default 5)
        tone: Gaya bahasa — "casual", "formal", "dramatic", "humor"
        language: Bahasa output caption

    Returns:
        String caption siap pakai untuk sosmed
    """
    plain_text = _srt_to_plain_text(srt_content)

    if not plain_text.strip():
        return ""

    client = _get_client()

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
    srt_content: str,
    max_words: int = 5,
    style: str = "Santai & Gaul (Gen-Z)",
    language: str = "indonesian",
) -> str:
    """
    Generate judul pendek untuk cover video dari transkrip SRT.

    Args:
        srt_content: Teks SRT mentah
        max_words: Maksimum kata dalam judul (default 5)
        style: Gaya bahasa (sama dengan caption social)
        language: Bahasa output

    Returns:
        String judul pendek siap dipakai di cover
    """
    plain_text = _srt_to_plain_text(srt_content)

    if not plain_text.strip():
        return ""

    client = _get_client()

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
            {"role": "system", "content": "Kamu adalah ahli pembuat judul video viral. Output HANYA judul, tanpa apapun."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.9,
        max_tokens=80,
        extra_body={"thinking": {"type": "disabled"}},
    )

    title = response.choices[0].message.content.strip()
    # Bersihkan: hapus tanda kutip, hashtag, emoji
    title = title.strip('"\'\"').strip()
    return title
