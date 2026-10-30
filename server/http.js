export async function body(req, limit = 100000) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limit) throw Error("Too large");
  }
  return JSON.parse(text);
}

export function localOrigin(req) {
  return (
    !req.headers.origin ||
    [
      `http://127.0.0.1:${req.socket.localPort}`,
      `http://localhost:${req.socket.localPort}`,
    ].includes(req.headers.origin)
  );
}
