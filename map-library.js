(() => {
  "use strict";

  const MODULE_ID = "long-campaign-map-library";
  const MODULE_TITLE = "Biblioteca de Mapas";
  const SOURCE = {
    owner: "mbround18",
    repo: "vtt-maps",
    branch: "main"
  };

  const CATEGORIES = [
    { id: "forest", label: "Florestas e Bosques", keywords: ["forest", "woods", "woodland", "grove", "jungle"] },
    { id: "city", label: "Cidades, Vilas e Ruas", keywords: ["city", "town", "village", "urban", "street", "slum", "market", "plaza"] },
    { id: "swamp", label: "Pântanos, Brejos e Mangues", keywords: ["swamp", "marsh", "bog", "mire", "mangrove", "wetland"] },
    { id: "tavern", label: "Tavernas, Estalagens e Pubs", keywords: ["tavern", "inn", "pub", "alehouse", "taproom"] },
    { id: "hotel", label: "Hotéis e Hospedarias", keywords: ["hotel", "hostel", "lodge", "boarding", "guesthouse"] },
    { id: "dungeon", label: "Masmorras, Criptas e Tumbas", keywords: ["dungeon", "tomb", "crypt", "catacomb", "litch", "lich", "undead"] },
    { id: "cave", label: "Cavernas, Minas e Subterrâneos", keywords: ["cave", "cavern", "mine", "mines", "underground", "tunnel"] },
    { id: "ruins", label: "Ruínas, Templos e Santuários", keywords: ["ruin", "ruins", "temple", "shrine", "church", "chapel", "sanctuary"] },
    { id: "castle", label: "Castelos, Fortalezas e Torres", keywords: ["castle", "keep", "fort", "fortress", "citadel", "tower", "spire", "spires"] },
    { id: "travel", label: "Estradas, Pontes, Acampamentos e Viagem", keywords: ["travel", "road", "bridge", "camp", "campsite", "crossroad", "trail"] },
    { id: "coast", label: "Praias, Costas, Portos e Navios", keywords: ["beach", "coast", "cove", "island", "port", "harbor", "harbour", "ship", "pirate", "dock"] },
    { id: "desert", label: "Desertos e Terras Áridas", keywords: ["desert", "dune", "oasis", "arid"] },
    { id: "tundra", label: "Tundra, Neve e Gelo", keywords: ["tundra", "snow", "ice", "frozen", "glacier", "winter"] },
    { id: "interior", label: "Casas, Prédios e Interiores", keywords: ["base_building", "building", "house", "home", "office", "interior", "room"] },
    { id: "encounter", label: "Encontros Genéricos", keywords: ["encounter", "encounters", "meeting", "arena", "battle"] },
    { id: "modern", label: "Moderno, Sci-Fi e Cyberpunk", keywords: ["cyberpunk", "modern", "sci-fi", "scifi", "institute", "laboratory", "lab"] },
    { id: "location", label: "Locações Especiais", keywords: ["locations", "location"] },
    { id: "other", label: "Outros Mapas", keywords: [] }
  ];

  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, "catalogInitialized", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });
    game.settings.register(MODULE_ID, "lastSync", {
      scope: "world",
      config: false,
      type: String,
      default: ""
    });
    game.settings.register(MODULE_ID, "sourceNoticeAccepted", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });
  });

  Hooks.once("ready", async () => {
    if (!game.user?.isGM) return;
    if (!game.settings.get(MODULE_ID, "catalogInitialized")) {
      try {
        await syncCatalog({ quiet: false });
      } catch (err) {
        console.error(`${MODULE_TITLE} | Falha na sincronização inicial`, err);
        ui.notifications?.error(`${MODULE_TITLE}: não foi possível montar o catálogo. Use o botão “Sincronizar Mapas” na aba Cenas para tentar novamente.`);
      }
    }
  });

  Hooks.on("renderSceneDirectory", (app, html) => {
    if (!game.user?.isGM) return;
    const root = html?.querySelector ? html : html?.[0];
    const footer = root?.querySelector?.(".directory-footer");
    if (!footer || footer.querySelector(`[data-${MODULE_ID}]`)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(`data-${MODULE_ID}`, "sync");
    button.innerHTML = '<i class="fa-solid fa-map"></i> Sincronizar Mapas';
    button.title = "Atualiza os compendiums da Biblioteca de Mapas";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await syncCatalog({ quiet: false });
      } catch (err) {
        console.error(`${MODULE_TITLE} | Falha ao sincronizar`, err);
        ui.notifications?.error(`${MODULE_TITLE}: falha ao sincronizar. Veja o console (F12) para detalhes.`);
      } finally {
        button.disabled = false;
      }
    });
    footer.appendChild(button);
  });

  Hooks.on("createScene", (scene, options, userId) => {
    if (!game.user?.isGM) return;
    if (userId && userId !== game.user.id) return;
    if (scene.pack) return;

    const meta = scene.getFlag(MODULE_ID, "catalog");
    if (!meta || meta.hydrated || meta.hydrating) return;
    setTimeout(() => hydrateScene(scene), 50);
  });

  async function syncCatalog({ quiet = false } = {}) {
    if (!game.user?.isGM) throw new Error("Somente um GM pode sincronizar os compendiums.");

    if (!quiet) ui.notifications?.info(`${MODULE_TITLE}: lendo o catálogo de mapas…`);
    const entries = await fetchSourceTree();
    if (!entries.length) throw new Error("Nenhum arquivo .dd2vtt foi encontrado na fonte.");

    const grouped = new Map(CATEGORIES.map(c => [c.id, []]));
    for (const entry of entries) grouped.get(classify(entry.path).id).push(entry);

    let added = 0;
    for (const category of CATEGORIES) {
      const pack = await ensurePack(category);
      const existing = await pack.getDocuments();
      const knownPaths = new Set(existing.map(d => d.getFlag(MODULE_ID, "catalog")?.sourcePath).filter(Boolean));
      const missing = grouped.get(category.id).filter(e => !knownPaths.has(e.path));
      if (!missing.length) continue;

      await pack.configure({ locked: false });
      try {
        for (let i = 0; i < missing.length; i += 40) {
          const batch = missing.slice(i, i + 40).map(entry => makePlaceholderScene(entry, category));
          await Scene.createDocuments(batch, { pack: pack.collection });
          added += batch.length;
        }
      } finally {
        await pack.configure({ locked: true });
      }
    }

    await game.settings.set(MODULE_ID, "catalogInitialized", true);
    await game.settings.set(MODULE_ID, "lastSync", new Date().toISOString());
    if (!quiet) {
      ui.notifications?.info(`${MODULE_TITLE}: ${entries.length} mapas catalogados; ${added} novos adicionados.`);
    }
    console.info(`${MODULE_TITLE} | sincronizado`, { total: entries.length, added });
  }

  async function fetchSourceTree() {
    const url = `https://api.github.com/repos/${SOURCE.owner}/${SOURCE.repo}/git/trees/${SOURCE.branch}?recursive=1`;
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`GitHub respondeu ${response.status} ao carregar o catálogo.`);
    const json = await response.json();
    if (json.truncated) console.warn(`${MODULE_TITLE} | A árvore do repositório veio truncada.`);
    return (json.tree || [])
      .filter(item => item.type === "blob" && item.path?.toLowerCase().endsWith(".dd2vtt"))
      .map(item => ({ path: item.path, sha: item.sha, size: item.size || 0 }))
      .sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
  }

  async function ensurePack(category) {
    const name = `maplib-${category.id}`;
    const collection = `world.${name}`;
    let pack = game.packs.get(collection);
    if (pack) return pack;

    pack = await CompendiumCollection.createCompendium({
      name,
      label: `Mapas — ${category.label}`,
      type: "Scene",
    });
    return pack;
  }

  function makePlaceholderScene(entry, category) {
    const base = entry.path.split("/").pop().replace(/\.dd2vtt$/i, "");
    const pretty = titleCase(base.replace(/[._-]+/g, " "));
    const rawUrl = `https://raw.githubusercontent.com/${SOURCE.owner}/${SOURCE.repo}/${SOURCE.branch}/${encodePath(entry.path)}`;
    const tags = buildTags(entry.path, category);

    return {
      name: pretty,
      width: 1000,
      height: 1000,
      padding: 0,
      grid: { size: 100 },
      levels: [{ name: "Mapa (carregado ao importar)" }],
      flags: {
        [MODULE_ID]: {
          catalog: {
            sourcePath: entry.path,
            sourceUrl: rawUrl,
            sourceRepository: `https://github.com/${SOURCE.owner}/${SOURCE.repo}`,
            category: category.id,
            categoryLabel: category.label,
            tags,
            sourceSize: entry.size,
            hydrated: false,
            hydrating: false
          }
        }
      }
    };
  }

  function classify(path) {
    const text = `/${path.toLowerCase().replace(/[_-]+/g, " ")}/`;
    // Prioriza termos específicos sobre pastas genéricas. Ex.: dungeons/mines -> Cavernas/Minas;
    // desert/buildings/desert-tavern -> Tavernas; cyberpunk/city -> Moderno/Cyberpunk.
    const priority = [
      "hotel", "tavern", "modern", "swamp", "cave", "ruins", "castle",
      "forest", "city", "coast", "desert", "tundra", "travel", "dungeon",
      "interior", "encounter", "location"
    ];
    for (const id of priority) {
      const category = CATEGORIES.find(c => c.id === id);
      if (category?.keywords.some(k => text.includes(k.replace(/[_-]+/g, " ")))) return category;
    }
    return CATEGORIES.find(c => c.id === "other");
  }

  function buildTags(path, category) {
    const words = path.toLowerCase()
      .replace(/\.dd2vtt$/i, "")
      .split(/[\/_.\-\s]+/)
      .filter(w => w && w.length > 2);
    return [...new Set([category.id, ...words])].slice(0, 24);
  }

  async function hydrateScene(scene) {
    const meta = foundry.utils.deepClone(scene.getFlag(MODULE_ID, "catalog"));
    if (!meta || meta.hydrated || meta.hydrating) return;

    await scene.setFlag(MODULE_ID, "catalog", { ...meta, hydrating: true });
    ui.notifications?.info(`${MODULE_TITLE}: preparando “${scene.name}”…`);

    try {
      const response = await fetch(meta.sourceUrl);
      if (!response.ok) throw new Error(`Falha ao baixar mapa (${response.status}).`);
      const uvtt = JSON.parse(await response.text());
      validateUvtt(uvtt);

      const originalPpg = Number(uvtt.resolution.pixels_per_grid) || 100;
      const ppg = computeSafePpg(uvtt.resolution.map_size.x, uvtt.resolution.map_size.y, originalPpg);
      const width = Math.round(uvtt.resolution.map_size.x * ppg);
      const height = Math.round(uvtt.resolution.map_size.y * ppg);

      const imageInfo = decodeImage(uvtt.image);
      const folder = await ensureUploadFolder(meta.category || "other");
      const safeBase = slugify(scene.name) || `map-${scene.id}`;
      const fileName = `${safeBase}-${scene.id}.${imageInfo.extension}`;
      const uploadFile = new File([imageInfo.bytes], fileName, { type: imageInfo.mime });
      await FilePicker.upload("data", folder, uploadFile, {});
      const imagePath = `${folder}/${fileName}`;

      await scene.update({
        width,
        height,
        padding: 0,
        grid: { size: ppg }
      });

      let level = scene.firstLevel || scene.levels?.contents?.[0] || scene.levels?.at?.(0);
      if (level?.update) {
        await level.update({ name: meta.categoryLabel || "Mapa", "background.src": imagePath });
      } else {
        await scene.update({ levels: [{ name: meta.categoryLabel || "Mapa", background: { src: imagePath } }] });
        level = scene.firstLevel || scene.levels?.contents?.[0] || scene.levels?.at?.(0);
      }

      const levelId = level?.id || level?._id || null;
      const walls = buildWalls(uvtt, ppg, levelId);
      const doors = buildDoors(uvtt, ppg, levelId);
      const lights = buildLights(uvtt, ppg, levelId);

      if (walls.length || doors.length) await scene.createEmbeddedDocuments("Wall", [...walls, ...doors]);
      if (lights.length) await scene.createEmbeddedDocuments("AmbientLight", lights);

      try {
        const thumb = await scene.createThumbnail();
        if (thumb?.thumb) await scene.update({ thumb: thumb.thumb });
      } catch (thumbError) {
        console.warn(`${MODULE_TITLE} | Não foi possível gerar thumbnail`, thumbError);
      }

      await scene.setFlag(MODULE_ID, "catalog", {
        ...meta,
        hydrated: true,
        hydrating: false,
        imagePath,
        importedAt: new Date().toISOString(),
        originalPixelsPerGrid: originalPpg,
        effectivePixelsPerGrid: ppg
      });

      if (ppg < originalPpg) {
        ui.notifications?.warn(`${MODULE_TITLE}: “${scene.name}” foi reduzido de ${originalPpg}px para ${ppg}px por quadrado para respeitar limites seguros do navegador.`);
      }
      ui.notifications?.info(`${MODULE_TITLE}: “${scene.name}” está pronto.`);
    } catch (err) {
      console.error(`${MODULE_TITLE} | Falha ao importar ${scene.name}`, err);
      await scene.setFlag(MODULE_ID, "catalog", { ...meta, hydrating: false });
      ui.notifications?.error(`${MODULE_TITLE}: não foi possível preparar “${scene.name}”. ${err.message || err}`);
    }
  }

  function validateUvtt(uvtt) {
    if (!uvtt || typeof uvtt !== "object") throw new Error("Arquivo Universal VTT inválido.");
    if (!uvtt.resolution?.map_size || !uvtt.resolution?.pixels_per_grid) throw new Error("O mapa não contém informações de grade.");
    if (!uvtt.image || typeof uvtt.image !== "string") throw new Error("O mapa não contém imagem incorporada.");
  }

  function buildWalls(uvtt, ppg, levelId) {
    const origin = uvtt.resolution.map_origin || { x: 0, y: 0 };
    const sets = [...(uvtt.line_of_sight || []), ...(uvtt.objects_line_of_sight || [])];
    const out = [];
    for (const polyline of sets) {
      if (!Array.isArray(polyline)) continue;
      for (let i = 0; i < polyline.length - 1; i++) {
        const a = polyline[i];
        const b = polyline[i + 1];
        if (!validPoint(a) || !validPoint(b)) continue;
        const wall = {
          c: [
            Math.round((a.x - origin.x) * ppg),
            Math.round((a.y - origin.y) * ppg),
            Math.round((b.x - origin.x) * ppg),
            Math.round((b.y - origin.y) * ppg)
          ]
        };
        if (levelId) wall.levels = [levelId];
        out.push(wall);
      }
    }
    return out;
  }

  function buildDoors(uvtt, ppg, levelId) {
    const origin = uvtt.resolution.map_origin || { x: 0, y: 0 };
    const out = [];
    for (const portal of uvtt.portals || []) {
      if (!Array.isArray(portal.bounds) || portal.bounds.length < 2) continue;
      const [a, b] = portal.bounds;
      if (!validPoint(a) || !validPoint(b)) continue;
      const closed = portal.closed !== false;
      const wall = {
        c: [
          Math.round((a.x - origin.x) * ppg),
          Math.round((a.y - origin.y) * ppg),
          Math.round((b.x - origin.x) * ppg),
          Math.round((b.y - origin.y) * ppg)
        ],
        door: closed ? 1 : 0,
        ds: closed ? 0 : 1,
        light: closed ? CONST.WALL_SENSE_TYPES.NORMAL : CONST.WALL_SENSE_TYPES.PROXIMITY,
        sight: closed ? CONST.WALL_SENSE_TYPES.NORMAL : CONST.WALL_SENSE_TYPES.PROXIMITY,
        threshold: closed ? {} : { attenuation: true, light: 10, sight: 10 }
      };
      if (levelId) wall.levels = [levelId];
      out.push(wall);
    }
    return out;
  }

  function buildLights(uvtt, ppg, levelId) {
    const origin = uvtt.resolution.map_origin || { x: 0, y: 0 };
    const gridDistance = Number(game.system?.grid?.distance) || 5;
    const out = [];
    for (const light of uvtt.lights || []) {
      if (!validPoint(light.position)) continue;
      const range = Math.max(0, Number(light.range) || 0);
      const intensity = Math.min(1, Math.max(0, Number(light.intensity) || 0.5));
      const color = normalizeColor(light.color);
      const doc = {
        x: Math.round((light.position.x - origin.x) * ppg),
        y: Math.round((light.position.y - origin.y) * ppg),
        rotation: 0,
        config: {
          angle: 360,
          color,
          dim: range * gridDistance,
          bright: (range * gridDistance) / 2,
          alpha: Math.max(0.02, intensity * 0.08)
        }
      };
      if (levelId) doc.levels = [levelId];
      out.push(doc);
    }
    return out;
  }

  function computeSafePpg(mapX, mapY, requested) {
    const maxDim = 11000;
    const maxArea = 11000 * 11000;
    const x = Math.max(1, Number(mapX) || 1);
    const y = Math.max(1, Number(mapY) || 1);
    let ppg = Math.max(50, Math.round(Number(requested) || 100));
    ppg = Math.min(ppg, Math.floor(maxDim / Math.max(x, y)));
    ppg = Math.min(ppg, Math.floor(Math.sqrt(maxArea / (x * y))));
    return Math.max(25, ppg);
  }

  async function ensureUploadFolder(category) {
    const base = `worlds/${game.world.id}/${MODULE_ID}`;
    const cat = `${base}/${slugify(category) || "other"}`;
    await createDirectorySafe(base);
    await createDirectorySafe(cat);
    return cat;
  }

  async function createDirectorySafe(path) {
    try {
      await FilePicker.createDirectory("data", path);
    } catch (err) {
      const message = String(err?.message || err || "").toLowerCase();
      if (!message.includes("exist") && !message.includes("eexist")) {
        // Some hosts throw a generic error when the directory already exists.
        try {
          await FilePicker.browse("data", path);
        } catch (_) {
          throw err;
        }
      }
    }
  }

  function decodeImage(base64) {
    const bytesText = atob(base64);
    const bytes = new Uint8Array(bytesText.length);
    for (let i = 0; i < bytesText.length; i++) bytes[i] = bytesText.charCodeAt(i);

    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { bytes, extension: "png", mime: "image/png" };
    }
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return { bytes, extension: "webp", mime: "image/webp" };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { bytes, extension: "jpg", mime: "image/jpeg" };
    }
    return { bytes, extension: "png", mime: "image/png" };
  }

  function normalizeColor(value) {
    let hex = String(value || "ffffff").replace(/^#/, "").replace(/[^0-9a-f]/gi, "");
    if (hex.length >= 8) hex = hex.slice(-6);
    if (hex.length > 6) hex = hex.slice(-6);
    if (hex.length < 6) hex = hex.padStart(6, "f");
    return `#${hex}`;
  }

  function validPoint(p) {
    return p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y));
  }

  function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function titleCase(text) {
    return text.replace(/\p{L}+/gu, word => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1));
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  // API mínima para diagnóstico pelo console: game.modules.get(MODULE_ID).api
  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (mod) mod.api = { syncCatalog, hydrateScene, classify, categories: CATEGORIES };
  });
})();
