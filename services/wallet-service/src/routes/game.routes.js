const router = require("express").Router();
const ctrl = require("../controllers/game.controller");

// GET /api/games
router.get("/", ctrl.getGames);

// POST /api/games/:uuid/init
router.post("/:uuid/init", ctrl.initGame);

// POST /api/games/:uuid/init-demo
router.post("/:uuid/init-demo", ctrl.initDemoGame);

router.post("/callback", async (req, res) => {
  console.log("📥 Incoming callback from:", req.headers["x-forwarded-for"] || req.ip);
  console.log("🧾 Headers:", req.headers);
  console.log("📦 Body:", req.body);
});


module.exports = router;
