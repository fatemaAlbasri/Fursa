
const { scoreCv, SECTION_MAX } = require('./cvStrength')

describe('scoreCv', () => {
  test('returns the expected result structure', () => {
    const result = scoreCv('', {
      knownSkills: [],
      onePage: true
    })

    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('scores')
    expect(result).toHaveProperty('comparison')

    expect(result.scores).toHaveProperty('summary')
    expect(result.scores).toHaveProperty('projects')
    expect(result.scores).toHaveProperty('skills')
    expect(result.scores).toHaveProperty('education')
    expect(result.scores).toHaveProperty('layout')
  })

  test('total equals the sum of section scores', () => {
    const result = scoreCv('', {
      knownSkills: [],
      onePage: true
    })

    const sum = Object.values(result.scores)
      .reduce((total, score) => total + score, 0)

    expect(result.total).toBe(sum)
  })

  test('section scores do not exceed their maximum points', () => {
    const cv = `
Ahmed Ali

Summary
Computer Science graduate with JavaScript and React skills.

Projects
- Developed a web application using JavaScript, React and Node.js.
- Improved application performance by 30%.

Skills
JavaScript, React, Node.js, Python, SQL, HTML, CSS, Git

Education
Bachelor of Computer Science
Graduation Year: 2025
Relevant Courses: Database Systems, Web Development
`

    const result = scoreCv(cv, {
      knownSkills: [
        'JavaScript',
        'React',
        'Node.js',
        'Python',
        'SQL',
        'HTML',
        'CSS',
        'Git'
      ],
      onePage: true
    })

    for (const [section, score] of Object.entries(result.scores)) {
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(SECTION_MAX[section])
    }
  })

  test('comparison contains the expected boolean fields', () => {
    const result = scoreCv('', {
      knownSkills: [],
      onePage: true
    })

    expect(result.comparison).toHaveProperty('short_summary')
    expect(result.comparison).toHaveProperty('projects_with_tools')
    expect(result.comparison).toHaveProperty('full_skill_names')
    expect(result.comparison).toHaveProperty('relevant_courses')

    for (const value of Object.values(result.comparison)) {
      expect(typeof value).toBe('boolean')
    }
  })
})
