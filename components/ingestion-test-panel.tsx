type Locale = "en" | "ko";

type IngestionTestPanelProps = {
  locale: Locale;
};

const COPY = {
  en: {
    eyebrow: "Internal ingestion",
    title: "Run VPS worker tests from the dashboard",
    description:
      "Temporary controls for validating app-to-VPS ingestion before wiring the final workflow.",
    home: "Open home feed result",
    search: "Open search result",
    homeLabel: "Home feed test",
    searchLabel: "Keyword search test",
    note: "Each button opens the raw API response in a new tab.",
  },
  ko: {
    eyebrow: "내부 수집 테스트",
    title: "대시보드에서 VPS 워커 테스트 실행",
    description:
      "최종 UX 연결 전에 앱에서 VPS 수집 워커를 직접 호출하는지 확인하는 임시 패널입니다.",
    home: "홈피드 결과 열기",
    search: "검색 결과 열기",
    homeLabel: "홈피드 테스트",
    searchLabel: "키워드 검색 테스트",
    note: "각 버튼은 API JSON 응답을 새 탭으로 엽니다.",
  },
} as const;

export function IngestionTestPanel({ locale }: IngestionTestPanelProps) {
  const t = COPY[locale];

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {t.eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          {t.title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.description}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <form
          action="/api/ingestion/home"
          method="post"
          target="_blank"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <input type="hidden" name="topic_cluster" value="health_fitness" />
          <input type="hidden" name="target_post_count" value="3" />
          <input type="hidden" name="scraper_account" value="threads_scraper_01" />
          <input type="hidden" name="locale" value={locale} />

          <p className="text-sm font-semibold text-slate-900">{t.homeLabel}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            topic_cluster=`health_fitness`, scraper_account=`threads_scraper_01`
          </p>

          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t.home}
          </button>
        </form>

        <form
          action="/api/ingestion/search"
          method="post"
          target="_blank"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <input type="hidden" name="topic_cluster" value="vibe_coding" />
          <input type="hidden" name="target_post_count" value="1" />
          <input type="hidden" name="scraper_account" value="threads_scraper_02" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="keywords" value="AI" />

          <p className="text-sm font-semibold text-slate-900">{t.searchLabel}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            topic_cluster=`vibe_coding`, keywords=`AI`, target=`1`
          </p>

          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t.search}
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-slate-500">{t.note}</p>
    </section>
  );
}
