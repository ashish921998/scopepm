import { describe, it, expect } from 'vitest'
import { extractTextFromHtml } from '../lib/html'

describe('extractTextFromHtml', () => {
  it('strips script tags and their content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>'
    expect(extractTextFromHtml(html)).toBe('Hello World')
  })

  it('strips style tags and their content', () => {
    const html = '<style>.foo { color: red; }</style><p>Content</p>'
    expect(extractTextFromHtml(html)).toBe('Content')
  })

  it('strips nav tags and their content', () => {
    const html = '<nav><a href="/">Home</a></nav><main>Main content</main>'
    expect(extractTextFromHtml(html)).toBe('Main content')
  })

  it('strips footer tags and their content', () => {
    const html = '<main>Body</main><footer>Copyright 2024</footer>'
    expect(extractTextFromHtml(html)).toBe('Body')
  })

  it('removes all HTML tags', () => {
    const html = '<div class="container"><h1>Title</h1><p>Paragraph</p></div>'
    expect(extractTextFromHtml(html)).toBe('Title Paragraph')
  })

  it('decodes common HTML entities', () => {
    const html = '<p>A &amp; B &lt; C &gt; D &quot;E&quot; &#39;F&#39; &nbsp;G</p>'
    expect(extractTextFromHtml(html)).toBe("A & B < C > D \"E\" 'F' G")
  })

  it('collapses whitespace', () => {
    const html = '<p>  Hello    World  </p>  <p>  Foo  </p>'
    expect(extractTextFromHtml(html)).toBe('Hello World Foo')
  })

  it('handles empty input', () => {
    expect(extractTextFromHtml('')).toBe('')
  })

  it('handles input with only tags', () => {
    expect(extractTextFromHtml('<div><span></span></div>')).toBe('')
  })
})
