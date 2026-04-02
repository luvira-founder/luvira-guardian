from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Auth0
    auth0_domain: str
    auth0_audience: str
    auth0_client_id: str
    auth0_client_secret: str
    auth0_issuer: str
    auth0_mgmt_api_audience: str

    # Token Vault API Client (resource_server type for federated exchange)
    auth0_tv_client_id: str = ""
    auth0_tv_client_secret: str = ""

    # Application
    app_env: str = "development"
    app_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:3000"
    log_level: str = "INFO"

    # External API base URLs
    gitlab_base_url: str = "https://gitlab.com/api/v4"
    slack_api_base_url: str = "https://slack.com/api"
    google_api_base_url: str = "https://www.googleapis.com"

    # Demo defaults
    demo_default_gitlab_project_id: str = ""
    demo_default_gitlab_issue_iid: str = ""
    demo_default_slack_channel: str = ""
    demo_default_calendar_id: str = "primary"

    @property
    def auth0_jwks_url(self) -> str:
        return f"https://{self.auth0_domain}/.well-known/jwks.json"

    @property
    def auth0_token_url(self) -> str:
        return f"https://{self.auth0_domain}/oauth/token"

    @property
    def auth0_mgmt_base_url(self) -> str:
        return f"https://{self.auth0_domain}/api/v2"

    @property
    def auth0_token_vault_base_url(self) -> str:
        return f"https://{self.auth0_domain}/api/v2"


@lru_cache
def get_settings() -> Settings:
    return Settings()
