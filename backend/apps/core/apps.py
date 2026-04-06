from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "apps.core"
    verbose_name = "Core"

    def ready(self):
        from .signals import connect_signals

        connect_signals()
