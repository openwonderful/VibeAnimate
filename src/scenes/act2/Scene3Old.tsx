import StageFloor from './stage/StageFloor'
import LEDWall from './stage/LEDWall'
import StageSymbols from './stage/StageSymbols'
import StageEquipment from './stage/StageEquipment'
import BackupDancers from './stage/BackupDancers'
import MemberReflections from './stage/MemberReflections'
import MemberSilhouettes from './stage/MemberSilhouettes'
import MemberSpotlights from './stage/MemberSpotlights'
import SparkParticles from './stage/SparkParticles'

export default function Scene3Old() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #050510 0%, #0A0515 40%, #1A1025 100%)',
      }}
    >
      <StageFloor />
      <LEDWall />
      <StageSymbols />
      <StageEquipment />
      <MemberReflections />
      <BackupDancers />
      <MemberSilhouettes />
      <MemberSpotlights />
      <SparkParticles />
    </div>
  )
}
