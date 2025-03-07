require('dotenv').config(); // Charger les variables d'environnement
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../models/connection'); // Assurez-vous que 'app' est correctement exporté depuis votre fichier principal
const Article = require('../models/articles'); // Importer le modèle Article

beforeAll(async () => {
  // Connecter à la base de données de test
  const mongoUri =  process.env.CONNECTION_STRING;
  if (!mongoUri) {
    throw new Error('La variable MONGO_URI_TEST n\'est pas définie dans le fichier .env');
  }
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  // Fermer la connexion à la base de données
  await mongoose.connection.close();
});

describe('GET /get-by/id/:id', () => {
  it('devrait retourner l\'article s\'il existe', async () => {
    // Créer un utilisateur fictif
    const mockUser = new mongoose.Types.ObjectId();

    // Créer un article fictif dans la base de données
    const mockArticle = new Article({
      title: 'Article de Test',
      productDescription: 'Description de test',
      category: '0-3ans',
      itemType: 'jouet',
      condition: 'bon état',
      price: 100,
      pictures: ['image1.jpg', 'image2.jpg'],
      articleCreationDate: new Date(),
      availableStock: 10,
      user: mockUser,
    });

    await mockArticle.save();

    // Faire une requête GET à la route
    const response = await request(app)
      .get(`/get-by/id/${mockArticle._id}`)
      .expect(200);

    // Vérifier la réponse
    expect(response.body.result).toBe(true);
    expect(response.body.article.id).toBe(mockArticle.id);
    expect(response.body.article.title).toBe('Article de Test');
  });

  it('devrait retourner une erreur 404 si l\'article n\'existe pas', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/get-by/id/${nonExistentId}`)
      .expect(404);

    expect(response.body.result).toBe(false);
    expect(response.body.error).toBe('Article not found');
  });
});
