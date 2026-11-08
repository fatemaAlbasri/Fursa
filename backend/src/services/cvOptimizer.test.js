
const { applySuggestions } = require('./cvOptimizer')

describe('applySuggestions', () => {
  const originalCv = `Ahmed Ali

Summary
Old summary

Projects
Old project`

  test('applies accepted suggestions', () => {
    const suggestions = [
      {
        section: 'summary',
        before_text: 'Old summary',
        after_text: 'Improved summary',
        status: 'accepted'
      }
    ]

    const result = applySuggestions(originalCv, suggestions)

    expect(result).toContain('Improved summary')
    expect(result).not.toContain('Old summary')
  })

  test('does not apply dismissed suggestions', () => {
    const suggestions = [
      {
        section: 'summary',
        before_text: 'Old summary',
        after_text: 'Improved summary',
        status: 'dismissed'
      }
    ]

    const result = applySuggestions(originalCv, suggestions)

    expect(result).toContain('Old summary')
    expect(result).not.toContain('Improved summary')
  })

  test('does not apply pending suggestions', () => {
    const suggestions = [
      {
        section: 'projects',
        before_text: 'Old project',
        after_text: 'Improved project',
        status: 'pending'
      }
    ]

    const result = applySuggestions(originalCv, suggestions)

    expect(result).toContain('Old project')
    expect(result).not.toContain('Improved project')
  })
})
