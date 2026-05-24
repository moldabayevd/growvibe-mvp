import { useState } from 'react'

// ── step definitions ────────────────────────────────────────────────────────

const macSteps = [
  {
    id: 'google',
    title: 'Google-аккаунт',
    intro: 'Для регистрации во всех сервисах нужен Google-аккаунт (почта Gmail).',
    instructions: [
      { n: 1, text: 'Открой браузер и перейди на mail.google.com' },
      { n: 2, text: 'Войди в аккаунт или создай новый' },
      { n: 3, text: 'Убедись, что помнишь логин и пароль — они понадобятся на следующих шагах' },
    ],
    links: [
      { label: 'Войти в Google', href: 'https://accounts.google.com' },
      { label: 'Создать аккаунт', href: 'https://accounts.google.com/signup' },
    ],
    checks: ['У меня есть рабочий Google-аккаунт, и я помню логин и пароль'],
  },
  {
    id: 'claude',
    title: 'Регистрация в Claude + подписка Pro',
    intro: 'Claude — AI, с которым мы работаем. Нужно зарегистрироваться и оформить подписку Pro ($20/мес).',
    note: 'Подписка оплачивается самостоятельно — не входит в стоимость практикума.',
    instructions: [
      { n: 1, text: 'Открой браузер, введи в Google "claude ai" или перейди на claude.ai' },
      { n: 2, text: 'Нажми "Continue with Google" и выбери свой Google-аккаунт' },
      { n: 3, text: 'Разреши доступ — нажми "Продолжить"' },
      { n: 4, text: 'Поставь галочку с условиями и нажми "Create account"' },
      { n: 5, text: 'На странице тарифов выбери Plan Pro, переключись на "Monthly"' },
      { n: 6, text: 'Нажми "Get Pro plan" → проверь что цена $20/мес' },
      { n: 7, text: 'Введи данные карты: имя, страна (Kazakhstan), город, номер карты, срок, CVC' },
      { n: 8, text: 'Поставь галочку согласия и нажми "Subscribe"' },
    ],
    links: [{ label: 'Открыть claude.ai', href: 'https://claude.ai' }],
    checks: [
      'Я зарегистрировался в Claude',
      'Я оформил подписку Pro ($20/мес)',
    ],
  },
  {
    id: 'claudeDesktop',
    title: 'Установка Claude Desktop',
    intro: 'Desktop-приложение мощнее веб-версии — Claude может работать с твоими файлами напрямую.',
    instructions: [
      { n: 1, text: 'После оплаты Claude покажет экран "Download for macOS" — нажми кнопку' },
      { n: 2, text: 'Открой скачанный файл Claude.dmg из папки Загрузки' },
      { n: 3, text: 'Перетащи иконку Claude в папку Программы (Applications)' },
      { n: 4, text: 'Открой Claude из Launchpad или папки Программы' },
      { n: 5, text: 'Войди в аккаунт — используй те же данные Google' },
    ],
    links: [{ label: 'Открыть claude.ai для скачивания', href: 'https://claude.ai/download' }],
    checks: ['Я установил Claude Desktop и вошёл в аккаунт'],
  },
  {
    id: 'github',
    title: 'Регистрация на GitHub',
    intro: 'GitHub — облачное хранилище для кода. Claude будет сохранять туда твои проекты.',
    instructions: [
      { n: 1, text: 'Перейди на github.com и нажми "Sign up"' },
      { n: 2, text: 'Введи email и нажми "Continue" — или сразу "Continue with Google"' },
      { n: 3, text: 'Выбери свой Google-аккаунт и нажми "Продолжить"' },
      { n: 4, text: 'Придумай имя пользователя (username) — латиница без пробелов, например: ivanov2025' },
      { n: 5, text: 'Пройди визуальный паззл (капчу) — выбери картинку где провода совпадают' },
      { n: 6, text: 'Готово! Ты на главном экране GitHub (Dashboard)' },
    ],
    links: [{ label: 'Перейти на GitHub', href: 'https://github.com/signup' }],
    checks: ['Я зарегистрировался на GitHub и вошёл в аккаунт'],
  },
  {
    id: 'token',
    title: 'GitHub токен для Claude',
    intro: 'Токен — это специальный пароль, который даёшь Claude, чтобы он мог сохранять проекты на GitHub.',
    note: 'Не вставляйте токен на этом сайте. Создайте его на GitHub, сохраните у себя и используйте только в своём Claude Desktop.',
    instructions: [
      { n: 1, text: 'На GitHub нажми на аватар (фото профиля) → выбери "Settings"' },
      { n: 2, text: 'Прокрути страницу вниз → "Developer settings" (самый последний пункт)' },
      { n: 3, text: 'Нажми Personal access tokens → Tokens (classic) → Generate new token (classic)' },
      { n: 4, text: 'В поле "Note" напиши: Claude' },
      { n: 5, text: 'В поле "Expiration" выбери "No expiration"' },
      { n: 6, text: 'Поставь галочку напротив "repo" в списке прав' },
      { n: 7, text: 'Нажми "Generate token" внизу страницы' },
      { n: 8, text: '⚠️ Токен показывается ОДИН РАЗ — скопируй его сразу и сохрани в заметках!' },
    ],
    links: [{ label: 'Открыть настройки GitHub', href: 'https://github.com/settings/tokens' }],
    checks: ['Я создал GitHub токен и сохранил его'],
  },
  {
    id: 'connect',
    title: 'Вставляем токен в Claude Desktop',
    intro: 'Теперь нужно сказать Claude, какой у тебя GitHub-аккаунт. Для этого вставим токен прямо в чат.',
    instructions: [
      { n: 1, text: 'Запусти Claude Desktop на Mac' },
      { n: 2, text: 'Нажми "Open Folder" и открой любую папку (создай новую если нет)' },
      { n: 3, text: 'В чате напиши сообщение (вставь свои данные):' },
      { n: null, code: 'Привет! Вот мой GitHub токен: [ТОКЕН]\nМой GitHub логин: [ЛОГИН]\nЗапомни эти данные.' },
      { n: 4, text: 'Отправь сообщение — Claude подтвердит подключение' },
    ],
    checks: ['Я вставил GitHub токен в Claude Desktop'],
  },
  {
    id: 'git',
    title: 'Проверяем Git на MacBook',
    intro: 'Git — система управления версиями. На Mac она может быть уже установлена — сначала проверим.',
    instructions: [
      { n: 1, text: 'Нажми Cmd+Пробел → напиши "Terminal" → Enter — откроется тёмное окно' },
      { n: 2, text: 'Введи команду и нажми Enter:' },
      { n: null, code: 'git --version' },
      { n: 3, text: 'Если видишь "git version 2.x.x" — Git уже есть, шаги 4-7 пропускай ✅' },
      { n: 4, text: 'Если видишь ошибку — перейди на brew.sh, скопируй команду установки Homebrew' },
      { n: null, code: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' },
      { n: 5, text: 'Вставь команду в Terminal (Cmd+V) и нажми Enter' },
      { n: 6, text: 'Введи пароль от Mac (символы не видны — это нормально) и нажми Enter' },
      { n: 7, text: 'Когда появится "Installation successful!" — введи:' },
      { n: null, code: 'brew install git' },
    ],
    links: [
      { label: 'Открыть brew.sh', href: 'https://brew.sh' },
      { label: 'Скачать Git', href: 'https://git-scm.com/download/mac' },
    ],
    checks: ['Я проверил Git — команда git --version работает'],
  },
  {
    id: 'folder',
    title: 'Создаём рабочую папку GrowVibeProjects',
    intro: 'Claude работает только в той папке, которую ты ему разрешил. Создаём папку для проектов с практикума.',
    instructions: [
      { n: 1, text: 'Открой Finder' },
      { n: 2, text: 'Перейди в Documents или на Рабочий стол' },
      { n: 3, text: 'Нажми правой кнопкой мыши → "Новая папка"' },
      { n: 4, text: 'Назови папку точно так (без пробелов):' },
      { n: null, code: 'GrowVibeProjects' },
      { n: 5, text: 'В Claude Desktop нажми "Open Folder" и выбери эту папку' },
      { n: 6, text: 'В окне "Trust this workspace?" нажми "Trust Workspace"' },
    ],
    checks: ['Я создал папку GrowVibeProjects и открыл её в Claude Desktop'],
  },
]

const winSteps = [
  {
    id: 'google',
    title: 'Google-аккаунт',
    intro: 'Для регистрации во всех сервисах нужен Google-аккаунт.',
    instructions: [
      { n: 1, text: 'Открой браузер и перейди на mail.google.com' },
      { n: 2, text: 'Войди в аккаунт или создай новый' },
      { n: 3, text: 'Убедись, что помнишь логин и пароль' },
    ],
    links: [
      { label: 'Войти в Google', href: 'https://accounts.google.com' },
      { label: 'Создать аккаунт', href: 'https://accounts.google.com/signup' },
    ],
    checks: ['У меня есть рабочий Google-аккаунт, и я помню логин и пароль'],
  },
  {
    id: 'claude',
    title: 'Регистрация в Claude + подписка Pro',
    intro: 'Claude — AI, с которым мы работаем. Нужно зарегистрироваться и оформить подписку Pro ($20/мес).',
    note: 'Подписка оплачивается самостоятельно — не входит в стоимость практикума.',
    instructions: [
      { n: 1, text: 'Перейди на claude.ai и нажми "Continue with Google"' },
      { n: 2, text: 'Выбери свой Google-аккаунт и разреши доступ' },
      { n: 3, text: 'Поставь галочку с условиями → "Create account"' },
      { n: 4, text: 'На тарифах выбери Pro → переключись на "Monthly" → "Get Pro plan"' },
      { n: 5, text: 'Введи данные карты и нажми "Subscribe"' },
    ],
    links: [{ label: 'Открыть claude.ai', href: 'https://claude.ai' }],
    checks: ['Я зарегистрировался в Claude', 'Я оформил подписку Pro ($20/мес)'],
  },
  {
    id: 'claudeDesktop',
    title: 'Установка Claude Desktop',
    intro: 'Desktop-приложение позволяет Claude работать с твоими файлами напрямую.',
    instructions: [
      { n: 1, text: 'После оплаты нажми "Download for Windows"' },
      { n: 2, text: 'Запусти скачанный установщик (.exe)' },
      { n: 3, text: 'Следуй инструкциям установщика' },
      { n: 4, text: 'Открой Claude и войди через Google' },
    ],
    links: [{ label: 'Открыть claude.ai', href: 'https://claude.ai/download' }],
    checks: ['Я установил Claude Desktop и вошёл в аккаунт'],
  },
  {
    id: 'github',
    title: 'Регистрация на GitHub',
    intro: 'GitHub — облачное хранилище для кода. Claude будет сохранять туда твои проекты.',
    instructions: [
      { n: 1, text: 'Перейди на github.com → "Sign up"' },
      { n: 2, text: 'Выбери "Continue with Google" → выбери аккаунт' },
      { n: 3, text: 'Придумай username — латиница без пробелов' },
      { n: 4, text: 'Пройди капчу (паззл с проводами)' },
    ],
    links: [{ label: 'Перейти на GitHub', href: 'https://github.com/signup' }],
    checks: ['Я зарегистрировался на GitHub и вошёл в аккаунт'],
  },
  {
    id: 'token',
    title: 'GitHub токен для Claude',
    intro: 'Токен — пароль, который Claude использует для сохранения проектов на GitHub.',
    note: 'Не вставляйте токен на этом сайте. Создайте его на GitHub, сохраните у себя и используйте только в своём Claude Desktop.',
    instructions: [
      { n: 1, text: 'На GitHub: аватар → Settings → Developer settings → Personal access tokens → Tokens (classic)' },
      { n: 2, text: 'Generate new token (classic) → Note: Claude → Expiration: No expiration' },
      { n: 3, text: 'Поставь галочку "repo" → Generate token' },
      { n: 4, text: '⚠️ Токен показывается ОДИН РАЗ — скопируй и сохрани!' },
    ],
    links: [{ label: 'Открыть настройки GitHub', href: 'https://github.com/settings/tokens' }],
    checks: ['Я создал GitHub токен и сохранил его'],
  },
  {
    id: 'connect',
    title: 'Вставляем токен в Claude Desktop',
    intro: 'Скажи Claude свой GitHub логин и токен — он запомнит для работы.',
    instructions: [
      { n: 1, text: 'Запусти Claude Desktop' },
      { n: 2, text: 'Открой папку GrowVibeProjects' },
      { n: 3, text: 'В чате напиши:' },
      { n: null, code: 'Привет! Вот мой GitHub токен: [ТОКЕН]\nМой GitHub логин: [ЛОГИН]' },
    ],
    checks: ['Я вставил GitHub токен в Claude Desktop'],
  },
  {
    id: 'git',
    title: 'Установка Git для Windows',
    intro: 'Git нужен для работы с проектами и сохранения изменений.',
    instructions: [
      { n: 1, text: 'Перейди на git-scm.com/download/win' },
      { n: 2, text: 'Скачай установщик для Windows' },
      { n: 3, text: 'Запусти установщик — оставь все настройки по умолчанию → Next → Install' },
      { n: 4, text: 'После установки перезагрузи компьютер' },
      { n: 5, text: 'Открой Command Prompt и проверь:' },
      { n: null, code: 'git --version' },
    ],
    links: [{ label: 'Скачать Git для Windows', href: 'https://git-scm.com/download/win' }],
    checks: ['Я установил Git — команда git --version работает'],
  },
  {
    id: 'folder',
    title: 'Создаём рабочую папку GrowVibeProjects',
    intro: 'Claude работает только в той папке, которую ты ему разрешил.',
    instructions: [
      { n: 1, text: 'Открой Проводник (Explorer)' },
      { n: 2, text: 'Перейди на Рабочий стол или в Документы' },
      { n: 3, text: 'Правая кнопка мыши → "Создать папку"' },
      { n: 4, text: 'Назови папку: GrowVibeProjects' },
      { n: 5, text: 'В Claude Desktop: Open Folder → выбери эту папку → Trust Workspace' },
    ],
    checks: ['Я создал папку GrowVibeProjects и открыл её в Claude Desktop'],
  },
]

// ── sub-components ──────────────────────────────────────────────────────────

function InstructionList({ items }) {
  return (
    <ol className="space-y-2 mb-4">
      {items.map((item, i) =>
        item.n === null ? (
          <li key={i} className="ml-6">
            <code className="block bg-gray-900 text-green-400 text-xs font-mono rounded-lg px-4 py-3 whitespace-pre-wrap leading-relaxed">
              {item.code}
            </code>
          </li>
        ) : (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D97757]/15 text-[#D97757] text-xs font-bold flex items-center justify-center mt-0.5">
              {item.n}
            </span>
            <span className="text-gray-600 text-sm leading-relaxed">{item.text}</span>
          </li>
        )
      )}
    </ol>
  )
}

function StepCard({ step, index, checked, onCheck, isOpen, onOpen, isLocked, isLast, onNext }) {
  const allChecked = step.checks.every((_, i) => checked[`${step.id}_${i}`])

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${
      allChecked
        ? 'border-green-300 bg-green-50'
        : isLocked
          ? 'border-gray-100 bg-gray-50 opacity-60'
          : isOpen
            ? 'border-[#D97757] shadow-sm'
            : 'border-gray-200 bg-white'
    }`}>
      {/* header */}
      <button
        className={`w-full flex items-center justify-between px-6 py-4 text-left ${isLocked ? 'cursor-not-allowed' : ''}`}
        onClick={isLocked ? undefined : onOpen}
        disabled={isLocked}
      >
        <div className="flex items-center gap-4">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
            allChecked ? 'bg-green-500 text-white'
            : isLocked ? 'bg-gray-200 text-gray-400'
            : isOpen ? 'bg-[#D97757] text-white'
            : 'bg-gray-100 text-gray-500'
          }`}>
            {allChecked ? '✓' : isLocked ? '🔒' : index + 1}
          </span>
          <span className={`font-semibold ${
            allChecked ? 'text-green-700'
            : isLocked ? 'text-gray-400'
            : 'text-gray-900'
          }`}>
            {step.title}
          </span>
        </div>
        {!isLocked && (
          <span className="text-gray-400 text-lg ml-4 flex-shrink-0">{isOpen ? '↑' : '↓'}</span>
        )}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100 bg-white">
          {/* intro */}
          <p className="text-gray-500 text-sm leading-relaxed mt-4 mb-4">{step.intro}</p>

          {/* warning note */}
          {step.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
              ⚠️ {step.note}
            </div>
          )}

          {/* numbered instructions */}
          {step.instructions && <InstructionList items={step.instructions} />}

          {/* external links */}
          {step.links && step.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {step.links.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#D97757] hover:bg-[#c4674a] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}

          {/* checkboxes */}
          <div className="space-y-2 pt-2 border-t border-gray-100 mt-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
              Отметь когда выполнишь:
            </p>
            {step.checks.map((text, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checked[`${step.id}_${i}`]}
                  onChange={e => onCheck(`${step.id}_${i}`, e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-[#D97757] flex-shrink-0"
                />
                <span className={`text-sm transition-colors ${checked[`${step.id}_${i}`] ? 'text-green-700 line-through' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {text}
                </span>
              </label>
            ))}
          </div>

          {/* next button */}
          <div className="mt-5">
            {isLast ? (
              allChecked && (
                <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center">
                  <p className="font-bold text-green-800">🎉 Все шаги выполнены!</p>
                  <p className="text-green-700 text-sm mt-1">Выберите город и дату занятия ↓</p>
                </div>
              )
            ) : (
              <button
                onClick={allChecked ? onNext : undefined}
                disabled={!allChecked}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  allChecked
                    ? 'bg-[#D97757] hover:bg-[#c4674a] text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {allChecked ? 'Далее →' : 'Отметьте выполненные пункты, чтобы продолжить'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── character sidebar ───────────────────────────────────────────────────────

function CharacterSidebar({ steps, completedCount }) {
  if (!steps.length) return null
  const done = completedCount >= steps.length
  const pct  = steps.length > 1
    ? Math.min((completedCount / (steps.length - 1)) * 100, 100)
    : completedCount > 0 ? 100 : 0

  return (
    <div className="sticky top-8 flex flex-col items-center" style={{ height: 520 }}>
      <span className="text-xs font-semibold text-gray-400 mb-3 tabular-nums">
        {completedCount}/{steps.length}
      </span>

      <div className="relative flex-1 w-full flex flex-col items-center">
        {/* track background */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-200 rounded-full" />

        {/* filled track */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#D97757] rounded-full transition-all duration-700 ease-in-out"
          style={{ height: `${pct}%` }}
        />

        {/* step dots */}
        {steps.map((step, i) => {
          const topPct = steps.length > 1 ? (i / (steps.length - 1)) * 100 : 50
          const isDone    = i < completedCount
          const isCurrent = i === completedCount
          return (
            <div
              key={step.id}
              className={`absolute left-1/2 rounded-full border-2 transition-all duration-500 ${
                isDone
                  ? 'w-3 h-3 bg-[#D97757] border-[#D97757]'
                  : isCurrent
                    ? 'w-4 h-4 bg-white border-[#D97757] shadow-[0_0_0_4px_rgba(217,119,87,0.18)]'
                    : 'w-2.5 h-2.5 bg-white border-gray-300'
              }`}
              style={{ top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
            />
          )
        })}

        {/* character */}
        <div
          className={`absolute left-1/2 text-2xl z-10 transition-all duration-700 ease-in-out ${
            done ? 'animate-celebrate' : 'animate-walk'
          }`}
          style={{ top: `${pct}%` }}
        >
          {done ? '🎉' : '🧑‍💻'}
        </div>
      </div>

      {done && (
        <span className="text-xs font-semibold text-green-600 mt-3">Готово!</span>
      )}
    </div>
  )
}

// ── main component ──────────────────────────────────────────────────────────

export default function PrepFlow({ onFlowComplete, flash }) {
  const [laptop, setLaptop] = useState(null)
  const [checked, setChecked] = useState({})
  const [openStep, setOpenStep] = useState(null)

  const steps = laptop === 'mac' ? macSteps : laptop === 'win' ? winSteps : []

  const handleCheck = (key, val) => {
    const next = { ...checked, [key]: val }
    setChecked(next)
    if (steps.length > 0 && steps.every(s => s.checks.every((_, i) => next[`${s.id}_${i}`]))) {
      onFlowComplete()
    }
  }

  const completedCount = steps.filter(s =>
    s.checks.every((_, i) => checked[`${s.id}_${i}`])
  ).length

  // first step that isn't completed yet = the "current" step
  const currentStep = steps.findIndex(s =>
    !s.checks.every((_, i) => checked[`${s.id}_${i}`])
  )
  // if all done, currentStep === -1 → allow any toggle (review mode)
  const activeStep = currentStep === -1 ? steps.length : currentStep

  const goNext = (i) => {
    if (i + 1 < steps.length) setOpenStep(i + 1)
  }

  return (
    <section
      id="prep"
      className={`py-20 bg-white transition-all ${flash ? 'animate-shake outline outline-2 outline-[#D97757] rounded-2xl' : ''}`}
    >
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Обязательно</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Перед регистрацией пройдите {laptop ? steps.length : 7} обязательных шагов
        </h2>
        <p className="text-gray-500 text-lg mb-6">
          Мы хотим, чтобы на обучение пришли подготовленные участники. Пройди подготовку заранее — это займёт 40–60 минут.
        </p>

        {/* download guide */}
        <a
          href="/guides/podgotovka-mac.docx"
          download
          className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-5 py-3 text-sm font-medium text-gray-700 transition-colors mb-8"
        >
          <span className="text-lg">📄</span>
          Скачать полную инструкцию со скриншотами (.docx)
        </a>

        {!laptop && (
          <div className="mb-8">
            <p className="font-semibold text-gray-900 mb-4">Выберите тип ноутбука:</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'mac', emoji: '🍎', label: 'У меня MacBook' },
                { key: 'win', emoji: '🪟', label: 'У меня Windows' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setLaptop(opt.key); setOpenStep(0) }}
                  className="border-2 border-gray-200 hover:border-[#D97757] hover:bg-[#D97757]/5 rounded-2xl p-6 text-center transition-all"
                >
                  <div className="text-4xl mb-2">{opt.emoji}</div>
                  <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {laptop && (
          <>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => { setLaptop(null); setChecked({}); setOpenStep(null) }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Изменить тип ноутбука
              </button>
              <span className="text-sm font-medium text-gray-500">
                {completedCount} / {steps.length} выполнено
              </span>
            </div>

            {/* progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
              <div
                className="bg-[#D97757] h-2 rounded-full transition-all duration-500"
                style={{ width: `${steps.length ? (completedCount / steps.length) * 100 : 0}%` }}
              />
            </div>

            <div className="flex gap-6">
              {/* step cards */}
              <div className="flex-1 space-y-3 min-w-0">
                {steps.map((step, i) => {
                  const locked = i > activeStep
                  return (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={i}
                      checked={checked}
                      onCheck={handleCheck}
                      isOpen={openStep === i}
                      onOpen={() => !locked && setOpenStep(openStep === i ? null : i)}
                      isLocked={locked}
                      isLast={i === steps.length - 1}
                      onNext={() => goNext(i)}
                    />
                  )
                })}
              </div>

              {/* character sidebar — desktop only */}
              <div className="hidden md:block w-14 flex-shrink-0">
                <CharacterSidebar steps={steps} completedCount={completedCount} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
