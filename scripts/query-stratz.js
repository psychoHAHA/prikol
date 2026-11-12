const token=process.env.STRATZ_TOKEN;
const query=`query HeroData($heroId: Short!) {
  constants { gameVersions { id name asOfDateTime } }
  heroStats {
    stats(heroIds: [$heroId], groupByTime: true) { heroId week matchCount winCount }
    matchUp(heroId: $heroId) {
      heroId
      vs { heroId1 heroId2 week matchCount winCount winRateHeroId1 winRateHeroId2 synergy }
    }
  }
}`;
const response=await fetch('https://api.stratz.com/graphql',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','User-Agent':'STRATZ_API'},body:JSON.stringify({query,variables:{heroId:2}}),signal:AbortSignal.timeout(30000)});
if (!response.ok) { console.error(`STRATZ returned HTTP ${response.status}.`); process.exit(1); }
const body=await response.json();
if(!response.ok||body.errors?.length){console.error('STRATZ returned a GraphQL error.');process.exitCode=1;}
else {const versions=body.data.constants.gameVersions;const stats=body.data.heroStats.stats;const latest=versions.reduce((a,b)=>a.asOfDateTime>b.asOfDateTime?a:b);console.log(JSON.stringify({latestGameVersion:latest,stats:stats.slice(-3),matchupRows:body.data.heroStats.matchUp?.[0]?.vs?.length}));}
