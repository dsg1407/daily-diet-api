import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req) => {
    console.log(`[${req.method}] ${req.url}`)
  })

  app.post('/', { preHandler: [checkSessionIdExists] }, async (req, reply) => {
    const createMealSchemaBody = z.object({
      name: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      onDiet: z.boolean(),
    })

    const { name, description, date, onDiet } = createMealSchemaBody.parse(
      req.body,
    )

    const userId = req.user?.id

    await knex('meals').insert({
      id: randomUUID(),
      user_id: userId,
      name,
      description,
      date: date.getTime(),
      on_diet: onDiet,
    })

    return reply.status(201).send()
  })

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (req, reply) => {
      const createReqParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = createReqParamsSchema.parse(req.params)

      const createMealSchemaBody = z.object({
        name: z.string(),
        description: z.string(),
        date: z.coerce.date(),
        onDiet: z.boolean(),
      })

      const { name, description, date, onDiet } = createMealSchemaBody.parse(
        req.body,
      )

      const userId = req.user?.id

      const meal = await knex('meals')
        .where({
          user_id: userId,
          id,
        })
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      await knex('meals').where({ id }).update({
        name,
        description,
        date: date.getTime(),
        on_diet: onDiet,
      })

      return reply.status(204).send()
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (req, reply) => {
      const createReqParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = createReqParamsSchema.parse(req.params)

      const meal = await knex('meals')
        .where({
          user_id: req.user?.id,
          id,
        })
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      await knex('meals').delete().where({
        id,
      })

      return reply.status(204).send()
    },
  )

  app.get('/', { preHandler: [checkSessionIdExists] }, async (req) => {
    const meals = await knex('meals').where('user_id', req.user?.id)

    return { meals }
  })

  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (req, reply) => {
      const createReqParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = createReqParamsSchema.parse(req.params)

      const meal = await knex('meals')
        .where({
          user_id: req.user?.id,
          id,
        })
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      return { meal }
    },
  )

  app.get('/metrics', { preHandler: [checkSessionIdExists] }, async (req) => {
    const mealsTotal = await knex('meals')
      .where('user_id', req.user?.id)
      .orderBy('date', 'desc')

    const { bestOnDietSequence } = mealsTotal.reduce(
      (acc, meal) => {
        if (meal.on_diet) {
          acc.currentSequence += 1
        } else {
          acc.currentSequence = 0
        }

        if (acc.currentSequence > acc.bestOnDietSequence) {
          acc.bestOnDietSequence = acc.currentSequence
        }

        return acc
      },
      { bestOnDietSequence: 0, currentSequence: 0 },
    )

    const metrics = {
      mealsTotal: mealsTotal.length,
      mealsOnDiet: mealsTotal.filter((meal) => meal.on_diet === 1).length,
      mealsOffDiet: mealsTotal.filter((meal) => meal.on_diet === 0).length,
      bestOnDietSequence,
    }

    return { metrics }
  })
}
