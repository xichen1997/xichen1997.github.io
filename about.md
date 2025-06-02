---
layout: default
title: About
---

<div class="about-container">
  <section class="about-intro">
    <h1>Welcome to My Magic House</h1>
    <p class="lead-text">
      A hub where I share my journey through fascinating topics in computer science and mathematics. 
      Here, you'll find everything from in-depth discussions on algorithms and data structures to 
      the mathematical puzzles that intrigue me.
    </p>
    <p>
      Whether you're a fellow enthusiast or just curious, I hope to spark your interest and invite 
      you to share your thoughts and insights as we explore these subjects together.
    </p>
  </section>

  <section class="pets-section">
    <h2>My Two Little Roommates</h2>
    <div class="pets-grid">
      <div class="pet-card">
        <h3>Maxwell</h3>
        <div class="pet-image">
          <img src="https://raw.githubusercontent.com/xichen1997/picture_for_blog/master/f43b848a60c6c482579b6c5f969cad7.jpg" alt="Maxwell"/>
        </div>
      </div>
      <div class="pet-card">
        <h3>Luna</h3>
        <div class="pet-image">
          <img src="https://raw.githubusercontent.com/xichen1997/picture_for_blog/master/fdf6d8e2de02b4d9fa8843abc3b44ac.jpg" alt="Luna"/>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
.about-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.about-intro {
  margin-bottom: 3rem;
}

.about-intro h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-weight: 700;
}

.lead-text {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #34495e;
  margin-bottom: 1rem;
}

.about-intro p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #4a5568;
}

.pets-section {
  margin-top: 3rem;
}

.pets-section h2 {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
}

.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.pet-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.pet-card:hover {
  transform: translateY(-5px);
}

.pet-card h3 {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
  text-align: center;
}

.pet-image {
  overflow: hidden;
  border-radius: 8px;
}

.pet-image img {
  width: 100%;
  height: auto;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.pet-image img:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .about-intro h1 {
    font-size: 2rem;
  }
  
  .lead-text {
    font-size: 1.1rem;
  }
  
  .pets-grid {
    grid-template-columns: 1fr;
  }
}
</style>
