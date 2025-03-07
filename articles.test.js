const request = require("supertest");
const app = require("./app"); 
const Article = require("./models/articles"); 

describe("GET /articles", () => {
  let testArticle;

  // création de l'article en BDD avant d'effectuer le test
  beforeAll(async () => {
    testArticle = await Article.create({
      title: "Jouet éducatif",
      productDescription: "Un jouet interactif pour apprendre",
      category: "Jouets",
      itemType: "Éducatif",
      condition: "Neuf",
      price: 15,
      availableStock: 5,
      pictures: ["https://example.com/image.jpg"],
    });
  });

  // Vérifier si l'article est présent en BDD
  it("Doit retourner une liste contenant l'article de test", async () => {
    const response = await request(app).get("/articles");
  
    console.log("Réponse API:", response.body); 
  
    expect(response.statusCode).toBe(200);
    expect(response.body.result).toBe(true);
    expect(Array.isArray(response.body.articles)).toBe(true);
    expect(response.body.articles.length).toBeGreaterThan(0);
  
    const foundArticle = response.body.articles.find(article => article.title === "Jouet éducatif");
    console.log("Article trouvé dans la db lors du test:", foundArticle);
    expect(foundArticle).toBeDefined();
    expect(foundArticle.title).toBe("Jouet éducatif");
  });
  
});


