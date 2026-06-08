'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import {
  getTicketById,
  ticketPriorityDropdownOptions,
  ticketStatusDropdownOptions,
  type TicketPerson,
} from '../tickets.data';
import type {
  TicketPriority,
  TicketStatus,
} from '../../../../components/tables/RecentTicketsTable';

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const ticket = useMemo(
    () => getTicketById(String(params?.ticketId ?? '')),
    [params?.ticketId],
  );

  if (!ticket) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
        >
          <BackArrowIcon />
          Back
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Ticket not found.
        </div>
      </div>
    );
  }

  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(
    ticket.status,
  );
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(
    ticket.priority,
  );
  const [selectedAssignee, setSelectedAssignee] = useState(
    ticket.assigneeDetail.name,
  );

  return (
    <div className="space-y-4 flex-1 w-full flex flex-col items-start">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
      >
        <BackArrowIcon />
        Back
      </button>

      <div className="grid grid-cols-1 flex-1 w-full  gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-9 flex flex-col">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
            <div className="grid grid-cols-1 gap-4 border-b border-gray-200 pb-5 md:grid-cols-3">
              <MetaItem label="Ticket ID" value={`#${ticket.id}`} />
              <MetaItem label="Created" value={ticket.date} />
              <div>
                <span className="block text-sm text-gray-500">Project</span>
                <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-sm font-medium text-purple-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
                    {ticket.project.initials}
                  </span>
                  {ticket.project.name}
                </span>
              </div>
            </div>

            <div className="pt-5">
              <h2 className="text-base md:text-xl leading-8 font-semibold text-gray-900">
                {ticket.title}
              </h2>
              <p className="mt-2  text-sm leading-7 text-gray-700">
                {ticket.description}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border flex-1 flex flex-col border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 md:px-5">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Replies
              </h3>
              <p className="text-sm text-gray-900">
                Files auto-sync to repository
              </p>
            </div>

            <div className="min-h-96 px-4 flex-1 py-5 md:px-5">
              {ticket.replies.length ? (
                <div className="space-y-4">
                  {ticket.replies.map((reply) => (
                    <article key={reply.id} className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-purple-700">
                        {reply.author.initials}
                      </span>
                      <div className="">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {reply.author.name}
                          </span>
                          <span className="text-xs text-gray-900">
                            {reply.createdAt}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{reply.message}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-80 flex-col h-full items-center justify-center text-center">
                  <EmptyRepliesIcon />
                  <p className="mt-4 text-base md:text-lg font-semibold text-gray-600">
                    No replies yet.
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    No responses have been added to this ticket yet.
                  </p>
                </div>
              )}
            </div>

            <div className=" px-4 py-4 md:px-5">
              <div className="rounded-sm bg-gray-100 px-3 py-2">
                <textarea
                  rows={3}
                  placeholder="Write a reply..."
                  className="w-full resize-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="mt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700"
                >
                  <PaperclipIcon />
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#10175A] px-5 py-3 text-sm font-semibold text-white"
                >
                  Reply
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:col-span-3">
          <section className="rounded-2xl border border-gray-200 bg-white">
            <h3 className="border-b border-gray-200 px-4 py-3 text-sm md:text-base font-semibold text-gray-900">
              Status & Priority
            </h3>
            <div className="space-y-4 p-4">
              <Dropdown
                label="Status"
                options={ticketStatusDropdownOptions}
                value={selectedStatus}
                onChange={(value) => setSelectedStatus(value as TicketStatus)}
              />
              <Dropdown
                label="Priority"
                options={ticketPriorityDropdownOptions}
                value={selectedPriority}
                onChange={(value) =>
                  setSelectedPriority(value as TicketPriority)
                }
              />
              <Dropdown
                label="Assignee"
                options={[
                  { label: 'Admin User', value: 'Admin User' },
                  { label: 'Jane Smith', value: 'Jane Smith' },
                  { label: 'Bob Lee', value: 'Bob Lee' },
                  { label: 'Sara Ngo', value: 'Sara Ngo' },
                ]}
                value={selectedAssignee}
                onChange={setSelectedAssignee}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white">
            <h3 className="border-b border-gray-200 px-4 py-3 text-sm md:text-base font-semibold text-gray-900">
              Attachments
            </h3>
            <div className="space-y-3 p-4">
              {ticket.attachments.length ? (
                ticket.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                  >
                    <FileBadgeIcon />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {attachment.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {attachment.sizeLabel}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No attachments added.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Due Date
              </h3>
              <button
                type="button"
                className="text-sm font-semibold text-red-500"
              >
                Clear
              </button>
            </div>
            <div className="p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Overdue
              </p>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <span className="text-sm text-gray-900">{ticket.dueDate}</span>
                <CalendarIcon />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white">
            <h3 className="border-b border-gray-200 px-4 py-3 text-sm md:text-base font-semibold text-gray-900">
              People
            </h3>
            <div className="space-y-4 p-4">
              <PersonCard person={ticket.reporter} />
              <PersonCard person={ticket.assigneeDetail} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-sm text-gray-500">{label}</span>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PersonCard({ person }: { person: TicketPerson }) {
  return (
    <div className="flex items-center gap-3 border-b border-purple-200 pb-4 last:border-b-0 last:pb-0">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-sm md:text-base font-semibold text-purple-700">
        {person.initials}
      </span>
      <div>
        <p className="text-sm text-gray-900">{person.role}</p>
        <p className="text-base md:text-lg font-semibold text-gray-900">
          {person.name}
        </p>
      </div>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.4375 8.99975C2.4375 9.27992 2.56174 9.53984 2.67939 9.73502C2.80635 9.94563 2.97708 10.1631 3.16439 10.3751C3.54013 10.8004 4.0304 11.2571 4.50618 11.6703C4.98475 12.0858 5.46167 12.4685 5.81794 12.7466C5.99637 12.8859 6.14523 12.9994 6.24978 13.0784C6.30207 13.1179 6.34332 13.1488 6.37169 13.1699L6.40436 13.1942L6.41303 13.2007L6.41604 13.2029C6.66617 13.3871 7.01862 13.334 7.20286 13.0838C7.3871 12.8337 7.33371 12.4816 7.08361 12.2973L7.07407 12.2903L7.04403 12.268C7.01746 12.2482 6.97815 12.2187 6.9279 12.1808C6.82738 12.1048 6.68327 11.9949 6.51014 11.8598C6.16329 11.589 5.70272 11.2194 5.2438 10.8208C4.78208 10.4199 4.33486 10.0008 4.00748 9.63023C3.98678 9.60679 3.96674 9.58375 3.94737 9.56114L15 9.56113C15.3107 9.56113 15.5625 9.30929 15.5625 8.99863C15.5625 8.68797 15.3107 8.43613 15 8.43613L3.94927 8.43614C3.96805 8.41423 3.98746 8.39194 4.00748 8.36927C4.33486 7.99871 4.78208 7.57959 5.2438 7.17865C5.70272 6.78013 6.16329 6.41046 6.51014 6.13974C6.68327 6.00461 6.82737 5.89466 6.9279 5.81872C6.97815 5.78076 7.01746 5.75133 7.04403 5.73153L7.07406 5.7092L7.08361 5.70214C7.33371 5.51789 7.3871 5.16578 7.20286 4.91567C7.01862 4.66554 6.66617 4.61237 6.41604 4.79662L6.41303 4.79884L6.40436 4.80525L6.37169 4.82954C6.34332 4.85069 6.30207 4.88157 6.24978 4.92107C6.14523 5.00005 5.99637 5.11363 5.81793 5.2529C5.46167 5.53098 4.98474 5.91364 4.50618 6.32922C4.0304 6.74237 3.54013 7.19911 3.16439 7.62441C2.97708 7.83642 2.80635 8.05386 2.67939 8.26448C2.56245 8.45847 2.43899 8.71646 2.43751 8.9947"
        fill="black"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.5 3.75C7.15279 3.75 5.25 5.65279 5.25 8V13.5001C5.25 17.228 8.27208 20.2501 12 20.2501C15.7279 20.2501 18.75 17.228 18.75 13.5001V12.0001C18.75 11.5859 19.0858 11.2501 19.5 11.2501C19.9142 11.2501 20.25 11.5859 20.25 12.0001V13.5001C20.25 18.0564 16.5563 21.7501 12 21.7501C7.44365 21.7501 3.75 18.0564 3.75 13.5001V8C3.75 4.82436 6.32436 2.25 9.5 2.25C12.6756 2.25 15.25 4.82436 15.25 8V13.5C15.25 15.2949 13.7949 16.75 12 16.75C10.2051 16.75 8.75 15.2949 8.75 13.5V9.5C8.75 9.08579 9.08579 8.75 9.5 8.75C9.91421 8.75 10.25 9.08579 10.25 9.5V13.5C10.25 14.4665 11.0335 15.25 12 15.25C12.9665 15.25 13.75 14.4665 13.75 13.5V8C13.75 5.65279 11.8472 3.75 9.5 3.75Z"
        fill="#020F52"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.66732 10.0001C6.20708 10.0001 5.83398 10.3732 5.83398 10.8334C5.83398 11.2937 6.20708 11.6667 6.66732 11.6667H6.67479C7.13503 11.6667 7.50813 11.2937 7.50813 10.8334C7.50813 10.3732 7.13503 10.0001 6.67479 10.0001H6.66732Z"
        fill="#1F2937"
      />
      <path
        d="M9.99691 10.0001C9.53668 10.0001 9.16358 10.3732 9.16358 10.8334C9.16358 11.2937 9.53668 11.6667 9.99691 11.6667H10.0044C10.4646 11.6667 10.8377 11.2937 10.8377 10.8334C10.8377 10.3732 10.4646 10.0001 10.0044 10.0001H9.99691Z"
        fill="#1F2937"
      />
      <path
        d="M13.3265 10.0001C12.8663 10.0001 12.4932 10.3732 12.4932 10.8334C12.4932 11.2937 12.8663 11.6667 13.3265 11.6667H13.334C13.7942 11.6667 14.1673 11.2937 14.1673 10.8334C14.1673 10.3732 13.7942 10.0001 13.334 10.0001H13.3265Z"
        fill="#1F2937"
      />
      <path
        d="M6.66732 13.3334C6.20708 13.3334 5.83398 13.7065 5.83398 14.1667C5.83398 14.627 6.20708 15.0001 6.66732 15.0001H6.67479C7.13503 15.0001 7.50813 14.627 7.50813 14.1667C7.50813 13.7065 7.13503 13.3334 6.67479 13.3334H6.66732Z"
        fill="#1F2937"
      />
      <path
        d="M9.99691 13.3334C9.53668 13.3334 9.16358 13.7065 9.16358 14.1667C9.16358 14.627 9.53668 15.0001 9.99691 15.0001H10.0044C10.4646 15.0001 10.8377 14.627 10.8377 14.1667C10.8377 13.7065 10.4646 13.3334 10.0044 13.3334H9.99691Z"
        fill="#1F2937"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.62565 1.66675C5.62565 1.32157 5.34583 1.04175 5.00065 1.04175C4.65547 1.04175 4.37565 1.32157 4.37565 1.66675V2.19574C3.70502 2.38582 3.1394 2.69475 2.6686 3.20372C2.02035 3.90454 1.73219 4.79002 1.59419 5.89967C1.45897 6.987 1.45898 8.38047 1.45898 10.1584V10.6751C1.45898 12.453 1.45897 13.8465 1.59419 14.9338C1.73219 16.0435 2.02035 16.929 2.6686 17.6298C3.32327 18.3375 4.16129 18.6585 5.21006 18.8109C6.22508 18.9584 7.52194 18.9584 9.15835 18.9584H10.8429C12.4794 18.9584 13.7762 18.9584 14.7912 18.8109C15.84 18.6585 16.678 18.3375 17.3327 17.6298C17.981 16.929 18.2691 16.0435 18.4071 14.9338C18.5423 13.8465 18.5423 12.453 18.5423 10.675V10.1585C18.5423 8.38048 18.5423 6.98701 18.4071 5.89967C18.2691 4.79002 17.981 3.90454 17.3327 3.20372C16.8619 2.69475 16.2963 2.38582 15.6256 2.19574V1.66675C15.6256 1.32157 15.3458 1.04175 15.0006 1.04175C14.6555 1.04175 14.3756 1.32157 14.3756 1.66675V1.97166C13.4289 1.87506 12.264 1.87507 10.8429 1.87508H9.15835C7.73734 1.87507 6.57237 1.87506 5.62565 1.97166V1.66675ZM4.39948 3.50495C4.47404 3.76673 4.71496 3.95841 5.00065 3.95841C5.34583 3.95841 5.62565 3.67859 5.62565 3.33341V3.2289C6.50982 3.12638 7.65263 3.12508 9.20898 3.12508H10.7923C12.3487 3.12508 13.4915 3.12638 14.3756 3.2289V3.33341C14.3756 3.67859 14.6555 3.95841 15.0006 3.95841C15.2863 3.95841 15.5273 3.76673 15.6018 3.50495C15.9412 3.64001 16.199 3.81888 16.4151 4.05252C16.8093 4.47874 17.0427 5.06331 17.1658 6.04706C17.139 6.04355 17.1117 6.04175 17.084 6.04175H2.91732C2.88958 6.04175 2.86227 6.04355 2.83549 6.04706C2.95858 5.06332 3.19197 4.47874 3.58623 4.05252C3.80234 3.81888 4.06006 3.64001 4.39948 3.50495ZM2.74243 7.26695C2.70945 8.06937 2.70898 9.03036 2.70898 10.2028V10.6307C2.70898 12.4626 2.71012 13.7784 2.83464 14.7796C2.95749 15.7675 3.19106 16.3538 3.58623 16.781C3.97499 17.2013 4.49838 17.4443 5.38985 17.5739C6.30462 17.7069 7.51055 17.7084 9.20898 17.7084H10.7923C12.4908 17.7084 13.6967 17.7069 14.6114 17.5739C15.5029 17.4443 16.0263 17.2013 16.4151 16.781C16.8102 16.3538 17.0438 15.7675 17.1667 14.7796C17.2912 13.7784 17.2923 12.4626 17.2923 10.6307V10.2028C17.2923 9.03036 17.2918 8.06937 17.2589 7.26695C17.2034 7.28309 17.1447 7.29175 17.084 7.29175H2.91732C2.85661 7.29175 2.79792 7.28309 2.74243 7.26695Z"
        fill="#1F2937"
      />
    </svg>
  );
}

function FileBadgeIcon() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-violet-50 text-[10px] font-bold text-violet-600">
      PDF
    </span>
  );
}

function EmptyRepliesIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.4"
        d="M20.1308 41.9077C21.4065 42.1474 22.7014 42.2675 24 42.2659C28.9628 42.2659 33.5038 40.5351 37 37.6698L9.43778 10C6.06626 13.4269 4 18.0436 4 23.1218C4 28.2014 6.06667 32.8168 9.43778 36.2419C10.18 36.996 10.6756 38.0263 10.4756 39.0868C10.1455 40.8206 9.39748 42.4379 8.30222 43.7858C11.1839 44.3221 14.1803 43.8392 16.75 42.4719C17.6584 41.9886 18.1125 41.7469 18.4331 41.6979C18.7536 41.6489 19.2127 41.7352 20.1308 41.9077Z"
        fill="#6B7280"
      />
      <path
        d="M24 5.5C20.9919 5.5 18.157 6.18357 15.6523 7.39323C14.9063 7.75351 14.0095 7.44083 13.6493 6.69485C13.289 5.94887 13.6017 5.05207 14.3476 4.69179C17.2535 3.28835 20.5339 2.5 24 2.5C35.8095 2.5 45.5 11.6768 45.5 23.1334C45.5 26.5935 44.6112 29.8567 43.0427 32.7205C42.6447 33.4471 41.7331 33.7136 41.0065 33.3156C40.2799 32.9177 40.0135 32.006 40.4115 31.2795C41.7464 28.8421 42.5 26.0726 42.5 23.1334C42.5 13.4575 34.2793 5.5 24 5.5Z"
        fill="#6B7280"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.93934 2.93934C3.52513 2.35355 4.47487 2.35355 5.06066 2.93934L45.0607 42.9393C45.6464 43.5251 45.6464 44.4749 45.0607 45.0607C44.4749 45.6464 43.5251 45.6464 42.9393 45.0607L37.2516 39.373C33.481 42.2005 28.8028 43.7555 23.9831 43.7555H23.943C22.5616 43.7555 21.1801 43.6357 19.8186 43.3759C19.6629 43.3491 19.5116 43.3223 19.3711 43.2974C18.9876 43.2295 18.6852 43.176 18.5973 43.176C18.5753 43.187 18.5202 43.216 18.4402 43.2581C18.2286 43.3695 17.8429 43.5725 17.436 43.7755C15.3138 44.8946 12.9512 45.4742 10.5887 45.4742L10.6488 45.4941C9.76781 45.4941 8.90688 45.4142 8.04595 45.2543C7.52539 45.1544 7.08492 44.7947 6.90473 44.2951C6.72453 43.7955 6.82465 43.236 7.14499 42.8363C8.086 41.6772 8.72669 40.2984 9.00699 38.7996C9.08708 38.3399 8.84681 37.7804 8.36629 37.2808C4.58223 33.4439 2.5 28.408 2.5 23.1123C2.5 18.1751 4.30987 13.481 7.62135 9.74267L2.93934 5.06066C2.35355 4.47487 2.35355 3.52513 2.93934 2.93934ZM9.74433 11.8657C6.99197 15.0237 5.4832 18.9765 5.4832 23.1323C5.4832 27.6486 7.26511 31.9052 10.4886 35.1825C11.6698 36.3815 12.2104 37.9003 11.9301 39.3591C11.7299 40.4582 11.3695 41.4974 10.869 42.4966C12.6509 42.4566 14.4328 41.997 16.0145 41.1577C17.1157 40.5781 17.6162 40.3183 18.1768 40.2184C18.7374 40.1385 19.278 40.2184 20.3191 40.4183C21.5404 40.6581 22.7618 40.758 23.9631 40.758C27.9855 40.758 31.8922 39.5028 35.0964 37.2177L9.74433 11.8657Z"
        fill="#6B7280"
      />
    </svg>
  );
}
