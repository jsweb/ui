export function evaluate(
  expression: string,
  context: Record<string, any> = {},
) {
  try {
    const fn = new Function(`with(this) { return ${expression} }`)
    return fn.call(context)
  } catch {
    return undefined
  }
}

export function evaluateEvent(
  $event: Event,
  expression: string,
  context: Record<string, any> = {},
) {
  try {
    const exp = expression.trim()
    const isIdentifier = /^[a-zA-Z_$][0-9a-zA-Z_$.]*$/.test(exp)
    const code = `${exp} instanceof Function ? ${exp}.call(this, $event) : ${exp}`
    const result = isIdentifier ? code : exp
    const fn = new Function('$event', `with(this) { ${result} }`)

    fn.call(context, $event)
  } catch {
    console.warn(`[jsweb/ui] Error evaluating event: ${expression}`)
  }
}
