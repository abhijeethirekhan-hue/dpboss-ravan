require('dotenv').config()
const axios = require('axios')
const cheerio = require('cheerio')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

async function scrapeDpboss() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Scraping started...`)
  
  try {
    const { data: html } = await axios.get('https://dpboss.boston', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    const $ = cheerio.load(html)
    
    const bazaars = []
    
    // Look for result cards in the specific structure
    $('.row .col-md-3').each((i, el) => {
      const card = $(el).find('.tkt-val')
      if (card.length === 0) return
      
      // Get the full text and split by newlines or spaces
      const fullText = card.text().trim()
      
      // Try to extract bazaar names and results using regex
      // Pattern: BAZAAR NAME: 123-45-678
      const pattern = /([A-Z\s]+[A-Z]):?\s*(\d{3}-\d{2}-\d{3})/g
      let match
      
      while ((match = pattern.exec(fullText)) !== null) {
        const name = match[1].trim()
        const result = match[2].trim()
        
        if (name && result) {
          bazaars.push({
            bazaar_name: name,
            result: result
          })
        }
      }
    })
    
    // Fallback: look for any span with result format
    if (bazaars.length === 0) {
      $('span').each((i, el) => {
        const text = $(el).text().trim()
        if (/\d{3}-\d{2}-\d{3}/.test(text)) {
          const prevText = $(el).prev().text().trim()
          const parentText = $(el).parent().text().trim()
          
          let name = prevText || parentText.split(text)[0].trim()
          name = name.replace(/[:\s]+$/, '')
          
          if (name && text) {
            bazaars.push({
              bazaar_name: name,
              result: text
            })
          }
        }
      })
    }
    
    console.log(`Found ${bazaars.length} bazaars`)
    
    // Save each result
    let savedCount = 0
    for (const bazaar of bazaars) {
      const parts = bazaar.result.split('-')
      
      const resultData = {
        bazaar_name: bazaar.bazaar_name,
        date: new Date().toISOString().split('T')[0],
        open_digit: parts[0] || null,
        jodi: parts[1] || null,
        close_digit: parts[2] || null,
        is_manual: false
      }
      
      const { error } = await supabase
        .from('results')
        .upsert(resultData, {
          onConflict: 'bazaar_name,date'
        })
      
      if (error) {
        console.error(`Error: ${bazaar.bazaar_name} -`, error.message)
      } else {
        console.log(`✅ ${bazaar.bazaar_name}: ${bazaar.result}`)
        savedCount++
      }
    }
    
    console.log(`\n✅ Complete — ${savedCount} records saved`)
    
  } catch (error) {
    console.error('Scraping failed:', error.message)
  }
}

// Run once immediately
scrapeDpboss()

// Then run every 30 minutes
setInterval(scrapeDpboss, 30 * 60 * 1000)