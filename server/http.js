export async function body(req, limit = 100000) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limit) throw Error("Too large");
  }
  return JSON.parse(text);
}
