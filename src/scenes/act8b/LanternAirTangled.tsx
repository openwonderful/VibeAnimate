/**
 * In the Air — `?act=8b-air-tangled`. The multicoloured set, full frame.
 *
 * The Tangled band from sheet two, given the whole frame: six rounded-box
 * shapes across the cream → butter → peach → coral → rose → magenta spread,
 * lit inside-out so the middles go near-white and the colour survives at the
 * rims.
 *
 * Same camera, same seed and the same rising field as `8b-air`, so this and
 * the amber sets differ in nothing but the lanterns themselves.
 *
 * The background is a shade off pure black and toward the mauve those plates
 * sit in — half of that palette IS the sky behind it, and coral over #04070E
 * is a different colour from coral over dusk.
 */
import { AirScene } from './LanternAir'

export default function LanternAirTangled() {
  return <AirScene set="tangled" background="#0B0710" />
}
