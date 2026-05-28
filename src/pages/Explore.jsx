function Explore() {
  return (
    <div>
      <div className="app-container py-5 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="page-title text-2xl">Explore Places</h1>
          <p className="muted-text mt-1">Find new businesses and join their queues.</p>
        </div>

        <section className="mb-8">
          <h2 className="section-title mb-4">Trending Near You</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="app-card">
                <div className="mb-3 h-32 rounded-lg bg-[#eeeeee] animate-pulse"></div>
                <h3 className="font-semibold text-[#333]">Coming Soon</h3>
                <p className="mt-1 text-sm text-[#777]">New places will appear here</p>
              </div>
            ))}
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="section-title mb-4">Categories</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {['Hospitals', 'Restaurants', 'Banks', 'Salons'].map((cat) => (
              <div key={cat} className="flex-shrink-0 rounded-full border border-[#e5e5e5] bg-white px-5 py-2 text-sm font-medium text-[#555] opacity-50 cursor-not-allowed">
                {cat}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Explore;
