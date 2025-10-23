const gameService = require("../services/game.service");

exports.getGames = async (req, res) => {
  try {
    const games = await gameService.listGames();
    // console.log("games are:", games)
    res.json({ games });
  } catch (err) {
    console.error("❌ Error fetching games:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.initGame = async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      player_id,
      currency,
      player_name,
      device,
      return_url,
      language,
    //   session_id,
      email,
    } = req.body;

    // ✅ Validate required fields
    if (!uuid || !player_id || !currency ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: game_uuid, player_id, currency, or session_id",
      });
    }

    console.log("🎮 initGame() controller called");
    console.log("🔹 Game UUID:", uuid);
    console.log("🔹 Player ID:", player_id);
    // console.log("🔹 Session ID:", session_id);
    console.log("🔹 Currency:", currency);

    const result = await gameService.initGame({
      player_id,
      game_uuid: uuid,
      currency,
      player_name,
      device,
      language,
      return_url,
    //   session_id,
      email,
    });

    res.status(200).json({
      success: true,
      message: "Game session initialized successfully",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error initializing game:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message || "Internal Server Error",
    });
  }
};


exports.initDemoGame = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { device, language, return_url } = req.body;

    const result = await gameService.initDemoGame({
      game_uuid: uuid,
      device,
      language,
      return_url,
    });

    res.status(200).json({
      success: true,
      message: "Demo game session initialized successfully",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error initializing demo game:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message,
    });
  }
};
