import { ASTNode } from '../../../core/types';

export const buildRegexTree = (regex: string): ASTNode => {
  let groupId = 1;
  let pos = 0;
  const root: ASTNode = { type: 'root', children: [], startIndex: 0 };
  const stack: ASTNode[] = [root];

  while (pos < regex.length) {
    const char = regex[pos];
    const current = stack[stack.length - 1];

    if (char === '\\') {
      if (pos + 1 < regex.length && (regex[pos + 1] === 'p' || regex[pos + 1] === 'P') && regex[pos + 2] === '{') {
         let end = pos + 3;
         while(end < regex.length && regex[end] !== '}') end++;
         if (end < regex.length && regex[end] === '}') {
            current.children!.push({ type: 'text', text: regex.substring(pos, end + 1), startIndex: pos, endIndex: end + 1 });
            pos = end + 1;
            continue;
         }
      }
      current.children!.push({ type: 'text', text: regex.substring(pos, pos + 2), startIndex: pos, endIndex: pos + 2 });
      pos += 2;
    } else if (char === '[') {
      let end = pos + 1;
      while (end < regex.length) {
        if (regex[end] === '\\') end += 2;
        else if (regex[end] === ']') { end++; break; }
        else end++;
      }
      current.children!.push({ type: 'text', text: regex.substring(pos, end), startIndex: pos, endIndex: end });
      pos = end;
    } else if (char === '(') {
      let isCapturing = true;
      let prefix = '(';
      let i = pos + 1;

      if (regex.startsWith('?', i)) {
        if (regex.startsWith('?:', i) || regex.startsWith('?=', i) || regex.startsWith('?!', i)) {
          isCapturing = false;
          prefix = regex.substring(pos, i + 2);
          i += 2;
        } else if (regex.startsWith('?<=', i) || regex.startsWith('?<!', i)) {
          isCapturing = false;
          prefix = regex.substring(pos, i + 3);
          i += 3;
        } else if (regex.startsWith('?P<', i)) {
          let closeBrace = regex.indexOf('>', i);
          if (closeBrace !== -1) {
            prefix = regex.substring(pos, closeBrace + 1);
            i = closeBrace + 1;
          }
        } else if (regex.startsWith('?<', i)) {
          let closeBrace = regex.indexOf('>', i);
          if (closeBrace !== -1) {
            prefix = regex.substring(pos, closeBrace + 1);
            i = closeBrace + 1;
          }
        } else if (regex.startsWith('?>', i) || regex.startsWith('?|', i)) {
          isCapturing = false;
          prefix = regex.substring(pos, i + 2);
          i += 2;
        } else {
          let colon = regex.indexOf(':', i);
          let closeParen = regex.indexOf(')', i);

          if (colon !== -1 && (closeParen === -1 || colon < closeParen)) {
             isCapturing = false;
             prefix = regex.substring(pos, colon + 1);
             i = colon + 1;
          } else if (closeParen !== -1) {
             current.children!.push({ type: 'text', text: regex.substring(pos, closeParen + 1), startIndex: pos, endIndex: closeParen + 1 });
             pos = closeParen + 1;
             continue;
          }
        }
      }

      const node: ASTNode = {
        type: 'group',
        isCapturing,
        id: isCapturing ? groupId++ : undefined,
        children: [{ type: 'text', text: prefix, startIndex: pos, endIndex: i }],
        startIndex: pos
      };
      current.children!.push(node);
      stack.push(node);
      pos = i;
    } else if (char === ')') {
      if (stack.length > 1) {
        const node = stack.pop()!;
        node.children!.push({ type: 'text', text: ')', startIndex: pos, endIndex: pos + 1 });
        node.endIndex = pos + 1;
      } else {
        current.children!.push({ type: 'text', text: ')', startIndex: pos, endIndex: pos + 1 });
      }
      pos++;
    } else if (char === '{') {
      let end = pos + 1;
      while (end < regex.length && regex[end] !== '}') {
        end++;
      }
      if (end < regex.length && regex[end] === '}') {
        let nextPos = end + 1;
        if (nextPos < regex.length && (regex[nextPos] === '?' || regex[nextPos] === '+')) {
          nextPos++;
        }
        current.children!.push({ type: 'text', text: regex.substring(pos, nextPos), startIndex: pos, endIndex: nextPos });
        pos = nextPos;
      } else {
        current.children!.push({ type: 'text', text: char, startIndex: pos, endIndex: pos + 1 });
        pos++;
      }
    } else if (char === '*' || char === '+' || char === '?') {
      let nextPos = pos + 1;
      if (nextPos < regex.length && (regex[nextPos] === '?' || regex[nextPos] === '+')) {
        nextPos++;
      }
      current.children!.push({ type: 'text', text: regex.substring(pos, nextPos), startIndex: pos, endIndex: nextPos });
      pos = nextPos;
    } else {
      current.children!.push({ type: 'text', text: char, startIndex: pos, endIndex: pos + 1 });
      pos++;
    }
  }

  while (stack.length > 1) {
    const node = stack.pop()!;
    node.endIndex = regex.length;
  }
  root.endIndex = regex.length;

  return root;
};