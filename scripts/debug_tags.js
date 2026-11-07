const fs = require('fs');
const content = fs.readFileSync('src/screens/ServiceChatScreen.tsx', 'utf8');

// Use babel parser or typescript compiler API to get exact syntax errors
const ts = require('typescript');
const sourceFile = ts.createSourceFile(
  'src/screens/ServiceChatScreen.tsx',
  content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

function report(node) {
  ts.forEachChild(node, child => {
    report(child);
  });
}

const diagnostics = ts.getPreEmitDiagnostics(
  ts.createProgram(['src/screens/ServiceChatScreen.tsx'], {
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
    target: ts.ScriptTarget.Latest,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  })
);

diagnostics.forEach(diag => {
  if (diag.file && diag.file.fileName.includes('ServiceChatScreen')) {
    const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
    console.log(`Line ${line + 1}, Char ${character + 1}: ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`);
  }
});
