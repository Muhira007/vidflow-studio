"""
Voice Activity Detection menggunakan Silero VAD (PyTorch).
Deteksi suara manusia berbicara vs noise/hening.

Model: Silero VAD via torch.hub (~1.6MB, CPU-only)
"""

import numpy as np
import soundfile as sf
from typing import List, Dict

# Lazy-load: model diinisialisasi saat pertama kali dipanggil
_model = None
_utils = None


def _get_model():
    """Load Silero VAD model (singleton)."""
    global _model, _utils
    if _model is None:
        import torch
        _model, _utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            trust_repo=True
        )
    return _model, _utils


def detect_speech_segments(
    audio_path: str,
    threshold: float = 0.5,
    min_speech_duration_ms: int = 300,
    min_silence_duration_ms: int = 200,
) -> List[Dict[str, float]]:
    """
    Deteksi segmen audio yang mengandung suara manusia.

    Args:
        audio_path: Path ke file audio (mp3/wav)
        threshold: Ambang batas probabilitas suara (0-1). Default 0.5
        min_speech_duration_ms: Durasi minimum segmen bicara (ms)
        min_silence_duration_ms: Durasi minimum jeda antar segmen (ms)

    Returns:
        List of dict: [{"start": 0.5, "end": 3.2}, ...] — detik mulai & selesai
    """
    model, utils = _get_model()
    get_speech_timestamps = utils[0]

    # Baca audio
    audio, sr = sf.read(audio_path)
    if len(audio.shape) > 1:
        audio = audio.mean(axis=1)  # stereo → mono

    # Resample ke 16kHz (linear interpolation)
    if sr != 16000:
        old_len = len(audio)
        new_len = int(old_len * 16000 / sr)
        audio = np.interp(
            np.linspace(0, old_len - 1, new_len),
            np.arange(old_len), audio
        )

    # Normalize ke [-1, 1]
    max_val = np.abs(audio).max()
    if max_val > 0:
        audio = audio / max_val

    # Convert ke PyTorch tensor
    import torch
    wav = torch.from_numpy(audio.astype(np.float32))

    # Deteksi speech timestamps
    speech_timestamps = get_speech_timestamps(
        wav, model,
        sampling_rate=16000,
        threshold=threshold,
        min_speech_duration_ms=min_speech_duration_ms,
        min_silence_duration_ms=min_silence_duration_ms,
    )

    # Konversi sample index → detik
    segments = [
        {
            "start": round(s["start"] / 16000, 2),
            "end": round(s["end"] / 16000, 2),
        }
        for s in speech_timestamps
    ]

    return segments


def get_speech_timestamps_ms(audio_path: str, **kwargs) -> List[Dict[str, int]]:
    """
    Convenience: return timestamp dalam milidetik.

    Returns:
        [{"start_ms": 500, "end_ms": 3200}, ...]
    """
    segments = detect_speech_segments(audio_path, **kwargs)
    return [
        {"start_ms": int(s["start"] * 1000), "end_ms": int(s["end"] * 1000)}
        for s in segments
    ]
