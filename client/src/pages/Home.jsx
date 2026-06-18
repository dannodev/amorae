import MainBanner from '../components/MainBanner'
import Categories from '../components/Categories'
import BestSeller from '../components/BestSeller'
import BottomBanner from '../components/BottomBanner'
import NewsLetter from '../components/NewsLetter'
import SeasonalBanner from '../components/SeasonalBanner'
import ReviewsSection from '../components/ReviewsSection'
import FaqSection from '../components/FaqSection'

const Home = () => {
  return (
    <div className="animate-fade-in">
        <MainBanner/>
        <SeasonalBanner/>
        <Categories/>
        <BestSeller/>
        <ReviewsSection/>
        <BottomBanner/>
        <FaqSection/>
        <NewsLetter/>
    </div>
  )
}

export default Home
