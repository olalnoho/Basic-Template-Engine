Object.defineProperty(Array.prototype, 'last', {
   get() {
      return this[this.length - 1]
   }
})

class WhiteSpaceError extends Error {
   constructor(tabLen) {
      super('Inconsistent whitespacing. ' + 'Expected tabsize of ' + tabLen)
   }
}
const validateWhiteSpace = n => p => {
   return p % n == 0
}

const getWhiteSpace = line => (line.match(/^\s+/g) || [''])[0].length

const getAttrs = line => {
   line = line.trim()
   const a = (line.match(/(?<=^\w+\()(.+)(?=\))/g) || [null])[0]
   if (!a) return
   const attribs = a.match(/(\w+\s*\=\s*\"[^\"]+\")/g)
   return attribs.reduce((a, c) => {
      let [k, v] = c.split('=')
      k = k.trim(), v = v.trim()
      if (!k && !v) return a
      a.push(`${k}=${v}`)
      return a
   }, [])
}

const getTagName = line => line.trim().match(/^\w+/)[0]

const getTextContent = line => {
   line = line.trim()
   if (/^\w+\(/.test(line)) {
      return line.replace(/^\w+\([^)]+\)/, '').trim()
   }

   return line.replace(/^\S+/, '').trim()
}

const makeObj = line => {
   return {
      whitespace: getWhiteSpace(line),
      attributes: getAttrs(line) || [],
      textContent: getTextContent(line),
      tag: getTagName(line),
      children: []
   }
}

const evalCond = (cond, input) => {
   if(/\$\{\w+\}/.test(cond)) {
      return cond.slice(2, -1) in input
   }
}

const iterate = (exprs, arr, parent, ws) => {
   for (let i = 0; i < arr.length; i++) {
      const formatted = exprs.map(x => x.replace('$_', arr[i]).replace('$i', i))
      formatted.forEach(x => {
         parent.children.push(makeObj(' '.repeat(ws) + x))
      })
   }
}

const buildIfBody = (exprs, parent, ws) => {
   console.log(exprs)
   exprs.forEach(e => {
      parent.children.push(
         makeObj(' ' .repeat(ws) + e)
      )
   })
}

const insertValues = (token, opts) => {
   return token.replace(/\$\{(\w+)\}/g, (val, g) => {
      if (!opts[g]) throw new Error(`Could not find value for ${g}`)
      return opts[g]
   })
}

const makeHTML = (node, first = false) => {
   let html = first ? `<!DOCTYPE html>\n` : ''
   let tabs = ' '.repeat(node.whitespace)
   const attribs = node.attributes.join(' ')
   html += `${tabs}<${node.tag}${attribs ? ' ' + attribs : ''}>\n`
   if (node.textContent) html += `${tabs} ${node.textContent}\n`
   for (const child of node.children) {
      html += makeHTML(child)
   }
   html += `${tabs}</${node.tag}>\n`
   return html
}

module.exports = {
   getWhiteSpace,
   makeObj,
   makeHTML,
   validateWhiteSpace,
   WhiteSpaceError,
   iterate,
   evalCond,
   buildIfBody,
   insertValues
}