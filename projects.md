---
layout: default
title: Projects
---

<div class="projects-container">
  <section class="projects-intro">
    <h1>My Projects</h1>
    <p class="lead-text">
      Here you'll find a collection of my work and personal projects. Each project represents a unique 
      challenge and learning experience in my journey through computer science and mathematics.
    </p>
  </section>

  <section class="projects-grid">
    <!-- Project cards will be added here -->
    <div class="project-card">
      <h3>Coming Soon</h3>
      <p>More projects will be added here soon!</p>
    </div>
  </section>
</div>

<style>
.projects-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.projects-intro {
  margin-bottom: 3rem;
}

.projects-intro h1 {
  font-size: 2.5rem;
  color: #4a9eff;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.lead-text {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #6ba9ff;
  margin-bottom: 1rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.project-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.project-card:hover {
  transform: translateY(-5px);
}

.project-card h3 {
  font-size: 1.5rem;
  color: #6ba9ff;
  margin-bottom: 1rem;
  font-weight: 500;
}

.project-card p {
  color: #8bb9ff;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .projects-intro h1 {
    font-size: 2rem;
  }
  
  .lead-text {
    font-size: 1.1rem;
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style> 