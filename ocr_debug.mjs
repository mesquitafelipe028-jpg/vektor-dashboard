import Tesseract from 'tesseract.js';
Tesseract.recognize('C:/Users/mesqu/.gemini/antigravity/brain/c173670d-1a52-48c2-999d-9ce4da5d7c41/media__1774725224264.png', 'por')
  .then(({ data: { text } }) => {
    console.log(text);
  });
