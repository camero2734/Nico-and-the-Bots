
import F from '../src/Helpers/funcs';
import { generateWords, morseEncode } from '../src/InteractionEntrypoints/slashcommands/apply/_consts';

export function yeah() {
    const validCharacters = "😀😁😂🤣😃😄😅😆😊😋😎🥲🤔😔😓🫤🙃😭😤😧🤬😡🤡🥺🥳🧐";
    const [dotChar, dashChar] = F.shuffle([...validCharacters]);

    console.log({ dotChar, dashChar });

    const morse = morseEncode(generateWords(), dotChar, dashChar);

    return morse;
}

console.log(yeah());
