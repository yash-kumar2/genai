const express = require('express')
const axios = require('axios')
const Roadmap = require('../models/Roadmap')
const auth = require('../middleware/auth') // assuming you have an auth middleware

const router = new express.Router()

// POST /roadmaps/generate
router.post('/roadmaps/generate', auth, async (req, res) => {
  try {
    console.log(process.env.OPENROUTER_API_KEY)
    
    const { goal, level = 'beginner', totalDays = 30, completedTopics = [] } = req.body
    if (!goal) return res.status(400).send({ error: 'Goal is required' })

    // Prompt for GenAI
    const prompt = `
You are a learning assistant. Create a study roadmap for the following goal: "${goal}".
The user's proficiency level is: ${level}.
They want to finish in ${totalDays} days.
${completedTopics.length > 0 ? `They already know: ${completedTopics.join(', ')}` : ''}

Return a roadmap as a list of tasks. Each task must include:
- title
- description (short summary of what to learn/do)
- due day number (from 1 to ${totalDays})
`

    // Call OpenRouter (free option)
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'mistralai/mistral-small-3.2-24b-instruct:free', // free on OpenRouter
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',

        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
      }
    })
    console.log(response.data)

    const aiContent = response.data.choices[0].message.content

    // Extract tasks (assume AI returns JSON or parseable list)
    const lines = aiContent.split('\n').filter(l => l.trim() !== '')
    const startDate = new Date()

    const tasks = lines.map((line, i) => {
      const [_, titlePart] = line.split('. ')
      return {
        title: titlePart.split(':')[0] || `Task ${i + 1}`,
        description: titlePart.split(':')[1] || '',
        dueDate: new Date(startDate.getTime() + i * 86400000), // +i days
      }
    })

    const roadmap = new Roadmap({
      goal,
      level,
      totalDays,
      tasks,
      owner: req.user._id
    })

    await roadmap.save()
    res.status(201).send(roadmap)

  } catch (e) {
    console.error(e)
    console.log('Full Error:', JSON.stringify(e.response.data, null, 2));
    res.status(500).send({ error: 'Failed to generate roadmap' })
    

  }
})

module.exports = router
