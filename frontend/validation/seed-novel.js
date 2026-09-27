/**
 * Realistic synthetic long-form novel for validation (authored for this
 * project — no copyrighted text). ~10 chapters, varied emotions, dialogue,
 * punctuation, numbers, unicode, long/short paragraphs.
 */
const CHAPTERS = [
  {
    title: 'Chapter 1 — The Lighthouse Keeper',
    text: `Mara counted the stairs again, the way she did every morning, and found one hundred and twelve of them exactly as always.

The sea was calm. Gulls wheeled over the harbor mouth, and the smell of salt and old paint filled the little round room at the top of the tower. She lit the lamp at dusk and put it out at dawn, and in between she read whatever books the supply boat left behind.

"You keep the light," her father used to say. "The light keeps everything else."

It had been eleven months since the supply boat last came. That was not unusual. What was unusual was the letter that had arrived on the Tuesday morning, carried up the one hundred and twelve steps by the wind itself, or so it seemed.

She read it twice. Then she sat for a long time, watching the water, and felt the first small, cold drop of worry slide into the back of her mind.`,
  },
  {
    title: 'Chapter 2 — What the Letter Said',
    text: `The paper was thin and cheap, the kind that drinks ink and bleeds it. The handwriting was her brother's, but hurried, as if written on a moving train.

Dear Mara. By the time you read this I will be gone. I am sorry. I do not want you to look for me. Sell the house in the town if you need money. Do not trust the man from the ferry office. I will write again when it is safe to write.

There was no signature. There was no address. There was a smear of something dark at the corner of the page, and Mara told herself it was ink.

She read the letter eleven times that night, and by the twelfth reading her eyes were hot and her throat was tight. The lamp turned slowly above her. Somewhere below, the sea knocked on the rocks like a visitor who would not go away.

She cried, finally, in the small hours, not because of what the letter said, but because of what it did not.`,
  },
  {
    title: 'Chapter 3 — The Man from the Ferry Office',
    text: `He arrived on Thursday, wearing a gray coat that had once been smart and shoes that had given up trying.

"Miss Corrigan," he said, though she had never told him her name. "Terrible weather for the season."

"The weather is fine," Mara said.

He smiled the way a door closes. "I represent the ferry office. There is a matter of your brother's ticket. Unpaid, I am afraid. The company expects settlement."

"How much?"

"Forty pounds. A small sum. A trifle." He looked past her, into the tower, the way a man looks when he is measuring the walls. "May I come in?"

"No," said Mara, and shut the door on his smile, and stood with her back against it while her heart banged like a shutter in the wind.

That night she took the letter from its tin and read it again. Do not trust the man from the ferry office. Too late, she thought. Two days too late.`,
  },
  {
    title: 'Chapter 4 — Storm Signals',
    text: `The barometer began to fall on Friday, slowly at first, then all at once, the way troubles do.

By dusk the horizon had gone the color of a bruise. Mara trimmed the wick, checked the oil, and climbed the outside gallery to fasten the shutters while the first gusts pulled at her coat like hands. Lightning stitched the far water. The light began its slow turn.

At 9:14 the storm arrived in earnest.

The wind tore the words out of her mouth before they could become a shout. Rain moved sideways. The tower leaned into the gale and groaned like an old ship, and still the lamp turned, and still she fed it oil, because that was the bargain her family had made with the sea a hundred years ago: we keep the light; the light keeps everything else.

At 2:03 in the morning, through a slit of black window, she saw a boat.`,
  },
  {
    title: 'Chapter 5 — The Wreck',
    text: `It came out of the rain the way a beast comes out of tall grass, all at once and much too close.

"No," Mara said. "No, no, no."

She seized the rope and the lantern and went down the outside stair while the storm tried to peel her off the tower. The beach was chaos. Waves ran up the sand and dragged the stones back down with a sound like grinding teeth.

The boat struck the reef with a crack she felt in her own ribs.

"Get the line!" she screamed at the shape floundering in the surf. "Throw the line!"

A man's arm, a rope, a lantern swinging wild. She waded in to her knees, her thighs, her waist. The water closed around her like a cold hand. Then something hard struck her across the shoulder blades, and the night went white, and then it went to nothing at all.`,
  },
  {
    title: 'Chapter 6 — The Room with Two Beds',
    text: `She woke in a room that smelled of carbolic soap and lavender, in a bed with iron rails, under a ceiling the color of weak tea.

"There now," said a voice. "Back with us."

An old woman in a nurse's gray sat knitting by the window, needles clicking like a small, patient clock. Through the window Mara could see a garden, a wall, and beyond the wall a line of poplars standing very straight, like soldiers who had been given bad news.

"Where am I?"

"The cottage hospital. You were brought in Thursday. You have been talking to sailors in your sleep." The needles paused. "There's a gentleman been asking after you. Every day. Gray coat. Teeth like a rented piano."

Mara's whole body went cold, in the way of a house when a door is left open somewhere far away.

"He mustn't find me," she whispered.

"Love," said the nurse, returning to her knitting, "I should imagine it's a bit late for mustn't."`,
  },
  {
    title: 'Chapter 7 — Forty Pounds',
    text: `The matron's office smelled of ink and scrubbed wood.

"You will want your things," the matron said, "and your things want money. The gentleman has offered to settle your bill. Kind of him, I'm sure."

"It isn't kind."

"He says he represents the ferry company. A matter of forty pounds, unpaid."

"Forty pounds," Mara repeated. The number had followed her across the water like a dog. Her brother's ticket. Unpaid. The company expects settlement.

She thought: he does not want forty pounds. Forty pounds is what you say when what you want cannot be bought.

"I can pay the hospital myself," she said. "I have some money."

"From where, may I ask?"

"From a lighthouse," said Mara, and was surprised to hear her own voice come out steady and hard as a nail.`,
  },
  {
    title: 'Chapter 8 — What the Nurse Knew',
    text: `The nurse's name was Mrs. Elward, and she had been fifty years old for the last twenty years.

"You brother," she said, on the third evening, "came through here in the spring. Fever. I sat with him two nights."

Mara sat up so fast the bed frame rang. "He was here? Where is he now?"

"Gone. Said he was going to the coast. Said—" Mrs. Elward stopped, and her needles stopped, and the room filled with the sound of the poplars outside, leaning and recovering, leaning and recovering.

"Said what?"

"Said if a gray-coated man came asking, to tell his sister the number backward. Forty pounds backward, girl. What does that make?"

Mara's mouth went dry. "Zero-four. Oh four."

"He wrote it on the back of a sermon and made me swear to give it to you only if you seemed in trouble." Mrs. Elward handed over a small folded square of paper, soft as cloth with handling. "You seem," she said, "in trouble."`,
  },
  {
    title: 'Chapter 9 — The Numbers Station',
    text: `There was a wireless set in the day room, an old thing with two dials and a smell of hot dust.

At midnight, when the ward slept, Mara tuned it, past the dance bands, past the weather, into the short static where the voices lived. And there it was: a woman's voice, flat as slate, reading numbers in groups of five.

Four. Zero. Four. Nine. One.
Nine. One. Two. Seven. Seven.

She wrote them on her palm with a pencil stub, heart hammering, while outside the poplars bowed and recovered, bowed and recovered, like an audience told to stay seated.

The numbers repeated at one o'clock. They repeated at two. At ten past two a car door closed in the lane outside, and gray shoes crossed the gravel, unhurried, and the night nurse looked up and said, "Why, Miss Corrigan, you're white as the sheets," and Mara understood that the forty pounds had never been about a ticket at all.`,
  },
  {
    title: 'Chapter 10 — The Light Keeps Everything Else',
    text: `She went home on the morning boat, the only passenger, wrapped in a coat two sizes too big, with a sermon folded in her pocket and a plan folding itself shut around her heart like a fan.

The tower stood against the sky exactly as she had left it. One hundred and twelve steps. The lamp, cold. The tin box, waiting.

She climbed. At the top, the sea lay flat and shining, innocent as a lied-about child. She cleaned the glass. She filled the oil. She trimmed the wick to the width her father had taught her, the width that throws a beam nineteen miles.

At dusk she lit it.

She thought: they will come asking about forty pounds. She thought: let them. The light would turn all night, over the hidden rocks and the honest water alike, and every ship that read it would read the same thing it had said for a hundred years, the thing her family had made with the sea:

We keep the light. The light keeps everything else.

And if the gray coat came up the one hundred and twelve steps, it would find the door locked, the lamp burning, and one woman on a rock who had finally stopped being afraid.`,
  },
];

function buildNovelTxt() {
  return CHAPTERS.map((c) => `${c.title}\n\n${c.text}`).join('\n\n');
}

if (typeof module !== 'undefined') {
  module.exports = { CHAPTERS, buildNovelTxt };
}
