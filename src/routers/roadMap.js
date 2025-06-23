const express = require('express');
const axios = require('axios');
const Roadmap = require('../models/Roadmap');
const auth = require('../middleware/auth');

const router = new express.Router();

router.post('/roadmaps/generate', auth, async (req, res) => {
  try {
    const { goal, level = 'beginner', totalDays = 30, completedTopics = [] } = req.body;
    if (!goal) return res.status(400).send({ error: 'Goal is required' });

    const prompt = `
You are a learning assistant. Create a study roadmap for the following goal: "${goal}".
The user's proficiency level is: ${level}.
They want to finish in ${totalDays} days.
${completedTopics.length > 0 ? `They already know: ${completedTopics.join(', ')}` : ''}

Return the roadmap as valid JSON array like this:
[
  {
    "title": "Linked Lists",
    "description": "Learn singly/doubly linked lists, traversal, insertion/deletion. Solve reversal, cycle detection, middle node.",
    "dueDay": 3
  }
]

Only respond with the JSON array. Do not include any commentary or markdown formatting.
    `;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // or 'mistralai/mistral-small-3.2-24b-instruct:free'
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiContent = response.data.choices[0]?.message?.content;
    if (!aiContent) {
      return res.status(500).send({ error: 'Empty AI response' });
    }

    let parsedTasks;
    try {
      parsedTasks = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.log('⚠️ AI Response was:', aiContent);
      return res.status(500).send({ error: 'Invalid JSON format from AI' });
    }

    const startDate = new Date();
    const tasks = parsedTasks.map((task, i) => ({
      title: task.title || `Task ${i + 1}`,
      description: task.description || '',
      dueDate: new Date(startDate.getTime() + (task.dueDay - 1) * 86400000),
    }));

    const roadmap = new Roadmap({
      goal,
      level,
      totalDays,
      tasks,
      owner: req.user._id,
    });

    await roadmap.save();
    res.status(201).send(roadmap);

  } catch (e) {
    console.error('🔥 Internal error:', e.message);
    if (e.response?.data) {
      console.log('Full Error:', JSON.stringify(e.response.data, null, 2));
    }
    res.status(500).send({ error: 'Failed to generate roadmap' });
  }
});
// GET /roadmaps
router.get('/roadmaps', auth, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ owner: req.user._id }).sort({ createdAt: -1 })
    res.send(roadmaps)
  } catch (e) {
    res.status(500).send({ error: 'Failed to fetch roadmaps' })
  }
})
// GET /roadmaps/:id
router.get('/roadmaps/:id', auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({
      _id: req.params.id,
      owner: req.user._id
    })

    if (!roadmap) return res.status(404).send({ error: 'Roadmap not found' })
    res.send(roadmap)
  } catch (e) {
    res.status(500).send({ error: 'Failed to fetch roadmap' })
  }
})
// PATCH /roadmaps/:roadmapId/tasks/:taskIndex
router.patch('/roadmaps/:roadmapId/tasks/:taskIndex', auth, async (req, res) => {
  try {
    const { roadmapId, taskIndex } = req.params
    const { completed } = req.body

    const roadmap = await Roadmap.findOne({
      _id: roadmapId,
      owner: req.user._id
    })

    if (!roadmap) return res.status(404).send({ error: 'Roadmap not found' })
    if (!roadmap.tasks[taskIndex]) return res.status(400).send({ error: 'Task not found' })

    roadmap.tasks[taskIndex].completed = completed
    await roadmap.save()

    res.send(roadmap.tasks[taskIndex])
  } catch (e) {
    res.status(500).send({ error: 'Failed to update task status' })
  }
})

module.exports = router;
