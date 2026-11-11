/**
 * `@acemir/cssom` package.json `browser` points at a UMD build that has no ESM
 * named exports. Re-export from the CJS main entry so `import { parse }` works
 * after Vite needsInterop / CJS transform.
 */
export {
  setup,
  CSSStyleDeclaration,
  CSSRule,
  CSSRuleList,
  CSSNestedDeclarations,
  CSSGroupingRule,
  CSSCounterStyleRule,
  CSSPropertyRule,
  CSSConditionRule,
  CSSStyleRule,
  MediaList,
  CSSMediaRule,
  CSSContainerRule,
  CSSSupportsRule,
  CSSImportRule,
  CSSNamespaceRule,
  CSSFontFaceRule,
  CSSHostRule,
  CSSStartingStyleRule,
  StyleSheet,
  CSSStyleSheet,
  CSSKeyframesRule,
  CSSKeyframeRule,
  MatcherList,
  CSSDocumentRule,
  CSSValue,
  CSSValueExpression,
  CSSScopeRule,
  CSSLayerBlockRule,
  CSSLayerStatementRule,
  CSSPageRule,
  parse,
  clone
} from '@acemir/cssom/lib/index.js'
