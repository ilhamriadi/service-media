const express = require("express");
const router = express.Router();
const isBase64 = require("is-base64");
const base64Img = require("base64-img");
const fs = require("fs");

const { Media } = require("../models");

router.get("/", async (req, res) => {
  try {
    const media = await Media.findAll({
      attributes: ["id", "image"],
    });
    const mappedMedia = media.map((m) => {
      m.image = `${req.get("host")}/${m.image}`;
      return m;
    });

    return res.json({
      status: "success",
      data: mappedMedia,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch media", details: error.message });
  }
});

router.post("/", (req, res) => {
  const { image } = req.body;

  if (!image || !isBase64(image, { mimeRequired: true })) {
    return res.status(400).json({ error: "Invalid base64 image" });
  }

  base64Img.img(
    image,
    "public/images",
    Date.now().toString(),
    async (err, filepath) => {
      if (err) {
        return res.status(400).json({ error: "Failed to save image" });
      }

      try {
        const filename = filepath.replace(/\\/g, "/").split("/").pop();
        const media = await Media.create({ image: `images/${filename}` });

        return res.status(201).json({
          status: "success",
          message: "Image uploaded successfully",
          data: {
            id: media.id,
            image: `${req.get("host")}/images/${filename}`,
          },
        });
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Database error", details: error.message });
      }
    }
  );
});
router.delete("/:id", async (req, res) => {
  const { id } = req.params; // Perbaikan destructuring

  const media = await Media.findByPk(id);
  if (!media) {
    return res.status(404).json({ error: "Media not found" });
  }
  fs.unlink(`public/${media.image}`, async (err) => {
    if (err && err.code !== "ENOENT") {
      // Jika error bukan karena file tidak ada
      return res.status(500).json({ error: "Failed to delete image" });
    }

    await media.destroy();
    return res.json({
      status: "success",
      message: "Media deleted successfully",
    });
  });
});

module.exports = router;
