'use client';

import { useState } from 'react';
import { CalendarEvent, Ticket, TicketPriority, TicketStatus } from '../types';
import { toDateString } from '../../lib/calendar-utils';

type ModalMode = 'event' | 'ticket';

interface AddModalProps {
  mode: ModalMode;
  selectedDate: string | null;
  onClose: () => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onAddTicket: (ticket: Omit<Ticket, 'id' | 'createdAt'>) => void;
}

export default function AddModal({
  mode,
  selectedDate,
  onClose,
  onAddEvent,
  onAddTicket,
}: AddModalProps) {
  const defaultDate = selectedDate || toDateString(new Date());

  // Event fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);

  // Ticket fields
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [status, setStatus] = useState<TicketStatus>('open');
  const [tags, setTags] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'event') {
      onAddEvent({
        title: title.trim(),
        date,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        type: 'event',
        allDay,
      });
    } else {
      onAddTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        priority,
        status,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'event' ? 'Add Event' : 'Add Ticket'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'event' ? 'Event title' : 'Ticket summary'}
              required
              autoFocus
            />
          </div>

          {mode === 'event' ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      style={{ marginRight: 6 }}
                    />
                    All day
                  </label>
                </div>
              </div>

              {!allDay && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Optional location"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TicketPriority)
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="bug, feature, urgent"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {mode === 'event' ? 'Add Event' : 'Add Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
