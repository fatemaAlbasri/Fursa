
const { renderCv, renderReport } = require('./cvPdf')

describe('cvPdf', () => {
  describe('renderCv', () => {
    test('generates a valid PDF buffer', async () => {
      const cv = `Ahmed Ali

Summary
Computer Science graduate with JavaScript skills.

Projects
Developed a web application using React and Node.js.`

      const result = await renderCv(cv)

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result.subarray(0, 5).toString()).toBe('%PDF-')
    })

    test('rejects CVs containing non-Latin letters', async () => {
      const cv = `أحمد علي

Summary
Software Developer`

      await expect(renderCv(cv)).rejects.toMatchObject({
        status: 422
      })
    })

    test('handles an empty CV', async () => {
      const result = await renderCv('')

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.subarray(0, 5).toString()).toBe('%PDF-')
    })
  })

  describe('renderReport', () => {
    const reportData = {
      review: {
        strength_score: 65,
        potential_score: 85,
        comparison: {
          short_summary: true,
          projects_with_tools: false,
          full_skill_names: true,
          relevant_courses: false
        }
      },
      suggestions: [
        {
          section: 'projects',
          points: 10,
          before_text: 'Built a website',
          after_text: 'Built a website using React and Node.js',
          reason: 'Adds technical details'
        }
      ],
      missing: [
        {
          section: 'education',
          advice: 'Add relevant courses',
          points: 5
        }
      ],
      major: 'Computer Science',
      fileName: 'my-cv.pdf'
    }

    test('generates a valid advanced report PDF', async () => {
      const result = await renderReport(reportData)

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result.subarray(0, 5).toString()).toBe('%PDF-')
    })

    test('rejects reports containing non-Latin letters', async () => {
      const invalidData = {
        ...reportData,
        major: 'هندسة البرمجيات'
      }

      await expect(renderReport(invalidData)).rejects.toMatchObject({
        status: 422
      })
    })
  })
})
