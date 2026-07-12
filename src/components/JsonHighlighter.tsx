import React from 'react';

interface JsonHighlighterProps {
  data: any;
}

export const JsonHighlighter: React.FC<JsonHighlighterProps> = ({ data }) => {
  if (!data) return null;
  const jsonStr = JSON.stringify(data, null, 2);

  const tokenize = (json: string) => {
    // Regex matches keys ("key":), string values ("val"), booleans (true/false), null, numbers, and structural symbols ([ ] { } , :)
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],])/g;
    
    let match;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let keyCounter = 0;

    const pushText = (text: string) => {
      if (text) {
        elements.push(<span key={`text-${keyCounter++}`} className="json-punctuation">{text}</span>);
      }
    };

    while ((match = regex.exec(json)) !== null) {
      // Add structural spacing/text before the token match
      pushText(json.substring(lastIndex, match.index));

      const token = match[0];
      if (/^"/.test(token)) {
        if (/:$/.test(token)) {
          // Key: remove the trailing colon for styling, then render the colon as punctuation
          elements.push(
            <span key={`key-${keyCounter++}`} className="json-key">
              {token.slice(0, -1)}
            </span>
          );
          elements.push(<span key={`colon-${keyCounter++}`} className="json-punctuation">:</span>);
        } else {
          // String Value
          elements.push(
            <span key={`str-${keyCounter++}`} className="json-string">
              {token}
            </span>
          );
        }
      } else if (/^(true|false)$/.test(token)) {
        // Boolean
        elements.push(
          <span key={`bool-${keyCounter++}`} className="json-boolean">
            {token}
          </span>
        );
      } else if (/^null$/.test(token)) {
        // Null
        elements.push(
          <span key={`null-${keyCounter++}`} className="json-null">
            {token}
          </span>
        );
      } else if (/^-?\d/.test(token)) {
        // Number
        elements.push(
          <span key={`num-${keyCounter++}`} className="json-number">
            {token}
          </span>
        );
      } else {
        // Punctuation/Brackets
        elements.push(
          <span key={`punc-${keyCounter++}`} className="json-punctuation">
            {token}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    pushText(json.substring(lastIndex));
    return elements;
  };

  return (
    <div className="highlighted-code-container">
      {tokenize(jsonStr)}
    </div>
  );
};
