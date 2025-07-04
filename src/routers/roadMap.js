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
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free', // or 'mistralai/mistral-small-3.2-24b-instruct:free'
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
// router.post('/roadmaps/prerequisite-graph', auth, async (req, res) => {
//   try {
//     const { goal, level = 'beginner', includeAdvanced = false } = req.body;
    
//     if (!goal) return res.status(400).send({ error: 'Goal is required' });

//     const prompt = `
// You are a learning assistant. Create a prerequisite dependency graph for the learning goal: "${goal}".
// The user's proficiency level is: ${level}.
// ${includeAdvanced ? 'Include advanced topics and their dependencies.' : ''}

// Return the prerequisite graph as valid JSON with this structure:
// {
//   "nodes": [
//     {
//       "id": "basics",
//       "title": "Programming Basics",
//       "description": "Variables, data types, control structures",
//       "difficulty": "beginner",
//       "estimatedHours": 20
//     }
//   ],
//   "edges": [
//     {
//       "from": "basics",
//       "to": "oop",
//       "relationship": "prerequisite"
//     }
//   ]
// }

// Only respond with the JSON object. Do not include any commentary or markdown formatting.
//     `;

//     const response = await axios.post(
//       'https://openrouter.ai/api/v1/chat/completions',
//       {
//         model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
//         messages: [{ role: 'user', content: prompt }],
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const aiContent = response.data.choices[0]?.message?.content;
//     if (!aiContent) {
//       return res.status(500).send({ error: 'Empty AI response' });
//     }

//     let prerequisiteGraph;
//     try {
//       prerequisiteGraph = JSON.parse(aiContent);
//     } catch (parseError) {
//       console.error('❌ JSON parse error:', parseError.message);
//       console.log('⚠️ AI Response was:', aiContent);
//       return res.status(500).send({ error: 'Invalid JSON format from AI' });
//     }

//     res.status(200).send(prerequisiteGraph);

//   } catch (error) {
//     console.error('🔥 Prerequisite graph error:', error.message);
//     if (error.response?.data) {
//       console.log('Full Error:', JSON.stringify(error.response.data, null, 2));
//     }
//     res.status(500).send({ error: 'Failed to generate prerequisite graph' });
//   }
// });

// // Get prerequisite graph for existing roadmap
// router.get('/roadmaps/:id/prerequisite-graph', auth, async (req, res) => {
//   try {
//     const roadmap = await Roadmap.findOne({
//       _id: req.params.id,
//       owner: req.user._id
//     });

//     if (!roadmap) {
//       return res.status(404).send({ error: 'Roadmap not found' });
//     }

//     // Generate prerequisite graph based on existing roadmap
//     const response = await axios.post(
//       `${req.protocol}://${req.get('host')}/roadmaps/prerequisite-graph`,
//       {
//         goal: roadmap.goal,
//         level: roadmap.level,
//         includeAdvanced: roadmap.level === 'advanced'
//       },
//       {
//         headers: {
//           'Authorization': req.headers.authorization,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     res.send(response.data);

//   } catch (error) {
//     console.error('Error fetching prerequisite graph:', error.message);
//     res.status(500).send({ error: 'Failed to fetch prerequisite graph' });
//   }
// });
router.get('/roadmaps/:id/prerequisite-graph', auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!roadmap) {
      return res.status(404).send({ error: 'Roadmap not found' });
    }

    // If graph is already cached, return it
    if (roadmap.prerequisiteGraph) {
      return res.send(roadmap.prerequisiteGraph);
    }

    const taskTitles = roadmap.tasks.map(task => task.title.trim());
    const formattedTitles = taskTitles.length
      ? `Only use topics from the following list of task titles: ${taskTitles.join(', ')}.`
      : '';

    const prompt = `
You are a learning assistant. Create a prerequisite dependency graph for the learning goal: "${roadmap.goal}".
The user's proficiency level is: ${roadmap.level}.
${roadmap.level === 'advanced' ? 'Include advanced topics and their dependencies.' : ''}
${formattedTitles}

Return the prerequisite graph as valid JSON with this structure:
{
  "nodes": [
    {
      "id": "basics",
      "title": "Programming Basics",
      "description": "Variables, data types, control structures",
      "difficulty": "beginner",
      "estimatedHours": 20
    }
  ],
  "edges": [
    {
      "from": "basics",
      "to": "oop",
      "relationship": "prerequisite"
    }
  ]
}

Only respond with the JSON object. Do not include any commentary or markdown formatting.
`;

    const aiResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiContent = aiResponse.data.choices[0]?.message?.content;

    if (!aiContent) {
      return res.status(500).send({ error: 'Empty AI response' });
    }

    let parsedGraph;
    try {
      parsedGraph = JSON.parse(aiContent);
    } catch (err) {
      console.error('❌ JSON parse error:', err.message);
      console.log('⚠️ AI Response:', aiContent);
      return res.status(500).send({ error: 'Invalid JSON format from AI' });
    }

    // Final validation: ensure all nodes are from roadmap.task titles
    const allowedTitles = new Set(taskTitles.map(t => t.toLowerCase()));
    const filteredNodes = parsedGraph.nodes.filter(node =>
      allowedTitles.has(node.title.toLowerCase())
    );
    const validNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = parsedGraph.edges.filter(edge =>
      validNodeIds.has(edge.from) && validNodeIds.has(edge.to)
    );

    const finalGraph = {
      nodes: filteredNodes,
      edges: filteredEdges
    };

    // Cache and save to DB
    roadmap.prerequisiteGraph = finalGraph;
    await roadmap.save();

    res.status(200).send(finalGraph);

  } catch (error) {
    console.error('🔥 Error generating prerequisite graph:', error.message);
    if (error.response?.data) {
      console.log('🌐 API Error:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).send({ error: 'Failed to generate prerequisite graph' });
  }
});
module.exports = router;
