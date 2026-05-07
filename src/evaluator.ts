export function evaluate(
  expression: string,
  context: Record<string, any> = {},
) {
  try {
    const fn = new Function(`with(this) { return ${expression} }`)
    return fn.call(context)
  } catch (error) {
    console.error(`[jsweb/ui] Error evaluating expression: ${expression}`, error)
    return undefined
  }
}

export function evaluateEvent(
  expression: string,
  context: Record<string, any> = {},
  $event: Event,
) {
  try {
    const exp = expression.trim()
    const isIdentifier = /^[a-zA-Z_$][0-9a-zA-Z_$.]*$/.test(exp)
    const code = `${exp} instanceof Function ? ${exp}.call(this, $event) : ${exp}`
    const result = isIdentifier ? code : exp

    const fn = new Function('$event', `with(this) { ${result} }`)
    fn.call(context, $event)
  } catch (error) {
    console.error(
      `[jsweb/ui] Error evaluating event expression: ${expression}`,
      error,
    )
  }
}
