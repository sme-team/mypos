// Đoạn code này giúp giải quyết một vấn đề phổ biến: Theo mặc định, TypeScript không biết cách xử lý 
// các tệp tin không phải là code (như .svg, .png, .css). 
// Nếu bạn cố gắng import một file SVG vào file .ts hoặc .tsx, TypeScript sẽ báo lỗi 
// vì nó không coi đó là một module hợp lệ.
declare module "*.svg" { // "Bất cứ khi nào tôi import một file có đuôi kết thúc bằng .svg, hãy áp dụng cấu trúc dữ liệu dưới đây cho nó.
    import React from 'react';
    import { SvgProps } from 'react-native-svg';
    const content: React.FC<SvgProps>; //Định nghĩa file SVG đó như một Functional Component của React.
    export default content;
}
