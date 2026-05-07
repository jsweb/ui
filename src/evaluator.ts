export function evaluate(
  expression: string,
  context: Record<string, any> = {},
) {
  try {
    const fn = new Function(`with(this) { return ${expression} }`)
    return fn.call(context)
  } catch (error) {
    console.warn(`[jsweb/ui] Error evaluating expression: ${expression}`, error)
    return undefined
  }
}

export function evaluateEvent(
  expression: string,
  context: Record<string, any> = {},
  $event: Event,
) {
  try {
    const fn = new Function('$event', `with(this) { ${expression} }`)
    fn.call(context, $event)
  } catch (error) {
    console.warn(
      `[jsweb/ui] Error evaluating event expression: ${expression}`,
      error,
    )
  }
  console.log('context', context)
}
