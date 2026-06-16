import { parseRepos } from "@/lib/ingest";
import { test, expect } from "vitest";

test("parsea url y equipo, ignora comentarios y vacías", () => {
  const txt = `# comentario\n\nhttps://github.com/elevenyellow/cluedo - Leños y Jose\n`;
  const r = parseRepos(txt);
  expect(r).toEqual([
    {
      url: "https://github.com/elevenyellow/cluedo",
      owner: "elevenyellow",
      name: "cluedo",
      team: "Leños y Jose",
    },
  ]);
});

test("línea sin equipo sigue parseando owner/name", () => {
  const r = parseRepos("https://github.com/foo/bar");
  expect(r[0]).toMatchObject({ owner: "foo", name: "bar", team: "" });
});

test("descarta urls que no son de github", () => {
  const r = parseRepos("not a url - equipo");
  expect(r).toEqual([]);
});
