// Character: Sans the Skeleton
// Situation: this is a uiverse challenge submission.
// Said challenge: AI Input
// Design an input field for an AI system using CSS or Tailwind.
// Your task is to design a sleek and interactive AI input field where users can enter their prompts. The input can stand alone or be accompanied by a button. The goal is to create an intuitive and visually appealing input field that feels like it belongs in an AI-powered interface.

// I want to make my AI system just Sans the Skeleton from Undertale

export const eod = Symbol('eod');

export type Dialog = {
  [key: string]: DialogEntry;
};

export type DialogEntry = [string, Dialog | typeof eod];

// begin message: hey buddy. you lost? or just... passing through
export const dialog: Dialog = {
  "I'm viewing submissions": [
    "that's a good thing. there's been a lot of bad ones lately.",
    {
      'Hey! I participated!': [
        "oh! i didn't even notice. which one was yours?",
        {
          'The unoriginal one': [
            'oh, that one. yeah, that was pretty bad.',
            {
              'I thought it was good': [
                "well, you're entitled to your wrong opinion.",
                {
                  'Meanie.': ['i know. i know. it’s part of my charm.', eod],
                  'I was just kidding.': [
                    'phew. for a second there, i thought you were serious.',
                    eod,
                  ],
                },
              ],
              'Well, is yours any better?': [
                "mine? nah, i don't submit. i just sit around and judge.",
                {
                  'Oh, okay.': ['yeah, i’m a professional couch critic.', eod],
                  'That seems unfair.': [
                    "it's not unfair. it's just lazy. big difference.",
                    eod,
                  ],
                },
              ],
            },
          ],
          "I'm literally dolza": [
            'oh, really? then why are you talking to me? go be awesome somewhere else.',
            {
              'Why?': ['because dolza is too good. it’s intimidating.', eod],
              'I hope I get first place.': [
                'well, i hope you trip over your own perfection. just kidding. ... or am i?',
                eod,
              ],
            },
          ],
        },
      ],
      'Are there any good ones?': [
        "well, there's sms' and dolza's. but that's about it.",
        {
          'What about mine?': [
            "oh, yours? uh... well... let's just say... it's unique. yeah, unique.",
            {
              'Unique how?': [
                'you know, like a snowflake. pretty to look at, but good luck finding it in a blizzard.',
                eod,
              ],
            },
          ],
          'I see.': [
            'yeah. but hey, at least you tried. that’s more than i did.',
            eod,
          ],
        },
      ],
      'What’s your favorite so far?': [
        "huh. tough one. i like the one that doesn't take itself too seriously.",
        {
          'What do you mean?': [
            "you know, the ones that don't try too hard. kind of like this one.",
            {
              'Like me?': [
                'exactly! just be yourself. unless you can be a skeleton. then always be a skeleton.',
                eod,
              ],
            },
          ],
          'Do you even care?': [
            'not really, but i wanted to sound helpful. did it work?',
            eod,
          ],
        },
      ],
    },
  ],
  'I just got here.': [
    "oh, okay. well, you're not missing much.",
    {
      'Why?': [
        'eh, most of the submissions are very dry. except the ones with cool CSS effects. those are neat.',
        {
          'Cool CSS effects?': [
            'yeah, you know, the ones that make the input field sparkle or glow. makes me feel all fancy.',
            {
              'Like a disco?': [
                "exactly! but instead of dancing, you're typing. it's a party for your fingers.",
                eod,
              ],
            },
          ],
          'I see.': ['yeah. sorry.', eod],
        },
      ],
      'I see.': ['yeah. sorry.', eod],
    },
  ],
  'I need help with my submission.': [
    "oh boy, you're asking the laziest skeleton for help? bold move.",
    {
      'It’s about the input field.': [
        "input fields, huh? i like 'em simple. clean. you know, like a nice bone polish.",
        {
          'Any tips?': [
            'sure. add a little animation. maybe a glow effect. make it fun. like a disco, but for words.',
            {
              'What about sound effects?': [
                'oh, now we’re talking! a little *ding* every time you hit enter? classy.',
                eod,
              ],
            },
          ],
          'What about colors?': [
            'blue. always blue. it’s classic. but hey, throw in some gradients if you’re feeling spicy.',
            {
              'Spicy gradients?': [
                "oh yeah, get wild. just don't burn the place down.",
                eod,
              ],
            },
          ],
        },
      ],
      'I don’t know where to start.': [
        'just start typing. that’s what input fields are for, right?',
        {
          'What if I mess up?': [
            "then you fix it. that's the beauty of it. like skeletons, we all have flaws.",
            eod,
          ],
        },
      ],
    },
  ],
};
