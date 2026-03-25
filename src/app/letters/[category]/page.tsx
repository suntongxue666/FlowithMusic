'use client'

import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import ExploreCards from '@/components/ExploreCards'
import Footer from '@/components/Footer'

const categoryInfo: Record<string, { title: string, description: string }> = {
    love: {
        title: "Love Letters with Music",
        description: "Explore romantic handwritten letters paired with meaningful songs. Whether it's a first crush, a long-distance relationship, or a lifelong partnership, find the music that captures the essence of love."
    },
    friendship: {
        title: "Friendship Letters with Music",
        description: "Discover messages of appreciation and shared memories between friends. Celebrate the special bond that only true friendship can provide, all set to the perfect soundtrack."
    },
    family: {
        title: "Family Letters with Music",
        description: "Heartfelt letters to parents, siblings, and relatives that bridge the distance. Express your gratitude, share your love, and keep family connections strong through the power of music."
    }
}

export default function CategoryPage() {
    const params = useParams()
    const category = (params.category as string || '').toLowerCase()
    const info = categoryInfo[category] || {
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Letters`,
        description: `Explore ${category} letters paired with music.`
    }

    // Map URL category to DB category (capitalized)
    const dbCategory = category.charAt(0).toUpperCase() + category.slice(1)

    return (
        <main>
            <Header currentPage="explore" />
            <div className="explore-container px-4">
                <div className="explore-header" style={{ paddingTop: '40px', paddingBottom: '20px', textAlign: 'center' }}>
                    <h1 
                        className="text-xl sm:text-2xl font-bold text-gray-900" 
                        style={{ 
                            fontFamily: "'Caveat', cursive", 
                            fontSize: '32px', // Caveat looks smaller so using 32px to match visual weight of My Letters
                            marginBottom: '4px'
                        }}
                    >
                        {info.title}
                    </h1>
                    <p 
                        className="page-description" 
                        style={{ 
                            fontSize: '20px', // 标题 24px (sm:text-2xl) - 4px = 20px
                            color: '#666',
                            maxWidth: '600px',
                            margin: '0 auto'
                        }}
                    >
                        {info.description}
                    </p>
                </div>

                <ExploreCards category={dbCategory} />
            </div>
            <Footer />
        </main>
    )
}
