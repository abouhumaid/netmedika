"""Backward-compatible imports for settings.

New code should import from :mod:`backend.core.settings`.
"""

from backend.core.settings import Settings, get_settings, settings

__all__ = ["Settings", "get_settings", "settings"]
