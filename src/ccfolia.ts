import { z } from "zod"


export const ScreenPanel = z.object({
    x: z.number().int().default(0),
    y: z.number().int().default(0),
    z: z.number().int().default(0),
    angle: z.number().int().default(0),
    width: z.number().int(),
    height: z.number().int(),
    deckId: z.string().nullable().default(null),
    locked: z.boolean().default(false),
    visible: z.boolean().default(true),
    closed: z.boolean().default(false),
    freezed: z.boolean().default(false),
    type: z.string().default("object"),
    active: z.boolean().default(true),
    memo: z.string().default(""),
    imageUrl: z.string().nullable(),
    coverImageUrl: z.string().nullable(),
    order: z.number().int()
})
export type ScreenPanel = z.infer<typeof ScreenPanel>;

export const DeckPanel = z.object({
    imageUrl: z.string(),
    memo: z.string()
})
export type DeckPanel = z.infer<typeof DeckPanel>;

export const Deck = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    width: z.number(),
    height: z.number(),
    coverImageUrl: z.string(),
    items: z.record(DeckPanel)
})
export type Deck = z.infer<typeof Deck>;

export const SatoriResult = z.object({
    id: z.string(),
    svg: z.string(),
    type: z.enum(["svg","png"]),
})
export const UrlOrSvg = z.string().or(SatoriResult).nullable().default(null)


export const CreateScreenPanel = ScreenPanel.extend({
    //imageUrl: UrlOrSvg,
    //coverImageUrl: UrlOrSvg,
    id: z.string().optional(),
    order: z.number().int().optional()
})
export type CreateScreenPanel = z.infer<typeof CreateScreenPanel>;

export const Resource = z.object( { type: z.string() })
export type Resource = z.infer<typeof Resource>;

export const DataJson = z.object({
    meta: z.object({ version: z.string() }),
    entities: z.object({
      room: z.object({}),
      decks: z.object({}),
      items: z.record(ScreenPanel),
      notes: z.object({}),
      characters: z.object({}),
      effects: z.object({}),
      scenes: z.object({})
    }),
    resources: z.record(Resource)
})
export type DataJson = z.infer<typeof DataJson>;