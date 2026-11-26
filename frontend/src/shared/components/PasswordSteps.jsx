// Bar above the Forgot password and Reset password cards: 1 Email → 2 Check email → 3 New password.
// `step` = the current step (1, 2 or 3); steps up to it are teal.
const STEPS = ['Email', 'Check email', 'New password']

export default function PasswordSteps({ step }) {
  return (
    <ol className="pw-steps" aria-label="Steps">
      {STEPS.map((name, i) => {
        const n = i + 1
        return (
          <li
            key={name}
            className={n <= step ? 'pw-steps__item pw-steps__item--on' : 'pw-steps__item'}
            aria-current={n === step ? 'step' : undefined}
          >
            <span className="pw-steps__bar" />
            {n} · {name}
          </li>
        )
      })}
    </ol>
  )
}
