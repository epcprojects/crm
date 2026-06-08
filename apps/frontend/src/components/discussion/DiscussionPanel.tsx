'use client';

type DiscussionReply = {
  id: string;
  author: {
    name: string;
    initials: string;
  };
  createdAt: string;
  message: string;
};

type DiscussionPanelProps = {
  title?: string;
  subtitle?: string;
  replies: DiscussionReply[];
  emptyTitle?: string;
  emptyDescription?: string;
  composerPlaceholder?: string;
};

export default function DiscussionPanel({
  title = 'Replies',
  subtitle = 'Files auto-sync to repository',
  replies,
  emptyTitle = 'No replies yet.',
  emptyDescription = 'No responses have been added to this ticket yet.',
  composerPlaceholder = 'Write a reply...',
}: DiscussionPanelProps) {
  return (
    <section className="rounded-2xl border flex-1 bg-white flex flex-col border-gray-200 ">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 md:px-5">
        <h3 className="text-sm md:text-base font-semibold text-gray-900">
          {title}
        </h3>
        <p className="text-sm text-gray-900">{subtitle}</p>
      </div>

      <div className="min-h-96 px-4 flex-1 py-5 md:px-5">
        {replies.length ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <article key={reply.id} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-purple-700">
                  {reply.author.initials}
                </span>
                <div>
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
              {emptyTitle}
            </p>
            <p className="mt-2 text-xs text-gray-500">{emptyDescription}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 md:px-5">
        <div className="rounded-sm bg-gray-100 px-3 py-2">
          <textarea
            rows={3}
            placeholder={composerPlaceholder}
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
