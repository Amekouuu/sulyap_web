// Labels and pill colors for every status in the system.
// tone names map to Pill styles: positive (mint), strong (filled forest), pending (gold),
// attention (terracotta), negative (red), neutral (grey).

// Destination workflow. Labels differ by who is looking.
export const WORKFLOW = {
  draft: { tone: 'neutral', submitter: 'Draft', admin: 'Draft', officer: 'Draft' },
  pending_verification: {
    tone: 'pending',
    submitter: 'Pending verification',
    admin: 'Pending screening',
    officer: 'Pending screening',
  },
  pending_endorsement: {
    tone: 'positive',
    submitter: 'With tourism officer',
    admin: 'Screened',
    officer: 'Pending',
  },
  endorsed: { tone: 'strong', submitter: 'Endorsed', admin: 'Endorsed', officer: 'Endorsed' },
  returned: { tone: 'attention', submitter: 'Returned', admin: 'Returned', officer: 'Returned' },
  rejected: { tone: 'negative', submitter: 'Rejected', admin: 'Rejected', officer: 'Rejected' },
};

// Reviews and photos. Pending contributions are not public until approved.
export const MODERATION = {
  pending: { tone: 'pending', label: 'Pending' },
  approved: { tone: 'positive', label: 'Approved' },
  flagged: { tone: 'attention', label: 'Flagged' },
  removed: { tone: 'negative', label: 'Removed' },
};

export const REPORT = {
  pending: { tone: 'pending', label: 'Pending' },
  under_review: { tone: 'attention', label: 'Under review' },
  resolved: { tone: 'strong', label: 'Resolved' },
  dismissed: { tone: 'neutral', label: 'Dismissed' },
};

// Registered User account verification, including the steps before an ID is uploaded.
export const ACCOUNT_VERIFICATION = {
  email_unverified: { tone: 'neutral', label: 'E-mail not verified' },
  no_id: { tone: 'neutral', label: 'ID not uploaded' },
  pending: { tone: 'pending', label: 'Pending review' },
  verified: { tone: 'positive', label: 'ID verified' },
  rejected: { tone: 'negative', label: 'ID rejected' },
};

export const ACCOUNT_STATUS = {
  active: { tone: 'positive', label: 'Active' },
  suspended: { tone: 'negative', label: 'Suspended' },
};

export const ROLE_LABELS = {
  registered_user: 'Registered User',
  administrator: 'Administrator',
  tourism_officer: 'Local Tourism Officer',
};
