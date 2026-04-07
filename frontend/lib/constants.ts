import { ApprovedStep, Service, WorkflowStep } from "@/types";

export const INITIAL_SERVICES: Service[] = [
  {
    id: "gitlab",
    name: "GitLab",
    status: "disconnected",
    connection: "gitlab",
    scope: "read_api",
    scopes: ["read_api"],
    logo: "/gitlab-logo.svg",
    logoWidth: 36,
    logoHeight: 36,
    connectLabel: "Connect GitLab",
  },
  {
    id: "sign-in-with-slack",
    name: "Slack",
    status: "disconnected",
    connection: "sign-in-with-slack",
    scope: "chat:write",
    scopes: ["chat:write"],
    logo: "/slack-logo.svg",
    logoWidth: 44,
    logoHeight: 44,
    connectLabel: "Connect Slack",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    status: "disconnected",
    connection: "google-oauth2",
    scope: "https://www.googleapis.com/auth/calendar.events, openid",
    scopes: ["https://www.googleapis.com/auth/calendar.events", "openid"],
    logo: "/google-calendar.svg",
    logoWidth: 36,
    logoHeight: 36,
    connectLabel: "Connect Google",
  },
];

export const INITIAL_STEPS: Array<ApprovedStep> = [
  {
    id: "retrieve_gitlab_issue",
    label: "retrieve_gitlab_issue",
    required: true,
    checked: true,
  },
  {
    id: "generate_incident_summary",
    label: "generate_incident_summary",
    required: true,
    checked: true,
  },
  {
    id: "send_slack_notification",
    label: "send_slack_notification",
    required: true,
    checked: true,
  },
  {
    id: "schedule_calendar_meeting",
    label: "schedule_calendar_meeting",
    required: false,
    checked: true,
  },
];

export const PLAN_STEPS = [
  "Retrieve GitLab incident issue",
  "Generate incident summary",
  "Notify Slack channel",
  "Schedule follow-up meeting",
];

export const STEP_ID_TO_ACTION: Record<string, string> = {
  "gitlab-read": "retrieve_gitlab_issue",
  summary: "generate_incident_summary",
  "slack-message": "send_slack_notification",
  "calendar-create": "schedule_calendar_meeting",
};

export const WORKFLOW_STEPS: Omit<WorkflowStep, "status">[] = [
  { id: "gitlab-read", label: "GitLab issue retrieved", service: "GitLab" },
  {
    id: "summary",
    label: "Incident summary generated",
    service: "Luvira Guardian",
  },
  { id: "slack-message", label: "Slack message sent", service: "Slack" },
  {
    id: "calendar-create",
    label: "Calendar event created",
    service: "Google Calendar",
  },
];
