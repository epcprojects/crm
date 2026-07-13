'use client';

import { GoogleCalendar } from '../types';

interface GoogleModalProps {
  isConnected: boolean;
  calendars: GoogleCalendar[];
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleCalendar: (id: string) => void;
}

export default function GoogleModal({
  isConnected,
  calendars,
  onClose,
  onConnect,
  onDisconnect,
  onToggleCalendar,
}: GoogleModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box google-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Google Calendar Integration</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {!isConnected ? (
          <div className="google-setup">
            <div className="setup-steps">
              <h3 className="steps-title">Setup Required</h3>
              <p className="steps-intro">
                Follow these steps to connect your Google Calendar:
              </p>

              <ol className="step-list">
                <li className="step-item">
                  <span className="step-num">1</span>
                  <div className="step-body">
                    <strong>Create a Google Cloud Project</strong>
                    <p>
                      Go to{' '}
                      <a
                        href="https://console.cloud.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="ext-link"
                      >
                        console.cloud.google.com
                      </a>{' '}
                      and create a new project or select an existing one.
                    </p>
                  </div>
                </li>

                <li className="step-item">
                  <span className="step-num">2</span>
                  <div className="step-body">
                    <strong>Enable Google Calendar API</strong>
                    <p>
                      Navigate to <em>APIs & Services → Library</em>, search for
                      "Google Calendar API" and enable it.
                    </p>
                  </div>
                </li>

                <li className="step-item">
                  <span className="step-num">3</span>
                  <div className="step-body">
                    <strong>Create OAuth 2.0 Credentials</strong>
                    <p>
                      Go to{' '}
                      <em>
                        APIs & Services → Credentials → Create Credentials →
                        OAuth 2.0 Client ID
                      </em>
                      .
                    </p>
                    <p>
                      Set application type to <em>Web application</em> and add
                      this redirect URI:
                    </p>
                    <code className="code-block">
                      http://localhost:3000/api/auth/google/callback
                    </code>
                  </div>
                </li>

                <li className="step-item">
                  <span className="step-num">4</span>
                  <div className="step-body">
                    <strong>Add to .env.local</strong>
                    <code className="code-block">
                      {`GOOGLE_CLIENT_ID=your_client_id\nGOOGLE_CLIENT_SECRET=your_client_secret\nGOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback\nNEXTAUTH_SECRET=your_random_secret_here\nNEXTAUTH_URL=http://localhost:3000`}
                    </code>
                  </div>
                </li>

                <li className="step-item">
                  <span className="step-num">5</span>
                  <div className="step-body">
                    <strong>Restart the server</strong>
                    <p>
                      Run <code>npm run dev</code> after adding environment
                      variables.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="scopes-info">
                <h4>Permissions requested</h4>
                <ul>
                  <li>
                    <code>calendar.readonly</code> — Read your calendar events
                  </li>
                  <li>
                    <code>calendar.events</code> — Create and delete events
                  </li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-submit google-connect-btn"
                onClick={onConnect}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginRight: 8 }}
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Connect Google Calendar
              </button>
            </div>
          </div>
        ) : (
          <div className="google-connected">
            <div className="connected-badge">
              <span className="connected-dot" />
              Connected to Google Calendar
            </div>

            <h3 className="calendars-title">Your Calendars</h3>
            <div className="calendar-list">
              {calendars.map((cal) => (
                <label key={cal.id} className="calendar-toggle">
                  <input
                    type="checkbox"
                    checked={cal.selected}
                    onChange={() => onToggleCalendar(cal.id)}
                  />
                  <span
                    className="cal-color"
                    style={{ background: cal.backgroundColor }}
                  />
                  <span className="cal-name">{cal.summary}</span>
                </label>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn-danger" onClick={onDisconnect}>
                Disconnect
              </button>
              <button className="btn-submit" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
