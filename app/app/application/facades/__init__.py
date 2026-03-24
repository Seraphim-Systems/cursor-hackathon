"""Facades: thin orchestration for HTTP and background flows."""

from app.application.facades.audio_upload_pipeline import save_audio_and_transcribe

__all__ = ["save_audio_and_transcribe"]
